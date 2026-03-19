const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.get("/", (req, res) => {
    res.send("VibeSynk Server Running 🚀");
});

let users = {};
let waitingQueue = [];

function generateUserId() {
    return "VS" + Math.floor(10000 + Math.random() * 90000);
}

function matchUsers() {
    while (waitingQueue.length >= 2) {
        const u1 = waitingQueue.shift();
        const u2 = waitingQueue.shift();

        if (!users[u1] || !users[u2]) continue;

        users[u1].partner = u2;
        users[u2].partner = u1;

        io.to(u1).emit("matched", users[u2].id);
        io.to(u2).emit("matched", users[u1].id);
    }
}

io.on("connection", (socket) => {

    const userId = generateUserId();

    users[socket.id] = {
        id: userId,
        partner: null
    };

    socket.emit("yourId", userId);

    socket.on("start-text", () => {
        if (!waitingQueue.includes(socket.id)) {
            waitingQueue.push(socket.id);
            matchUsers();
        }
    });

    socket.on("next", () => {
        const partner = users[socket.id]?.partner;

        if (partner && users[partner]) {
            io.to(partner).emit("partner-left");
            users[partner].partner = null;
        }

        users[socket.id].partner = null;

        if (!waitingQueue.includes(socket.id)) {
            waitingQueue.push(socket.id);
        }

        matchUsers();
    });

    socket.on("message", (msg) => {
        const partner = users[socket.id]?.partner;

        if (partner && users[partner]) {
            io.to(partner).emit("message", msg);
        }
    });

    socket.on("disconnect", () => {
        const partner = users[socket.id]?.partner;

        if (partner && users[partner]) {
            io.to(partner).emit("partner-left");
            users[partner].partner = null;
        }

        waitingQueue = waitingQueue.filter(id => id !== socket.id);
        delete users[socket.id];
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

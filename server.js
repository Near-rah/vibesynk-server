const fs = require("fs");
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Basic route (IMPORTANT for Hostinger)
app.get("/", (req, res) => {
    res.send("VibeSynk Chat Server Running ✅");
});

// Users
let users = [];
let waitingUser = null;

// Update JSON
function updateOnlineFile() {
    try {
        fs.writeFileSync("users.json", JSON.stringify({
            online: users.length
        }));
    } catch (e) {
        console.log("JSON error:", e);
    }
}

io.on("connection", (socket) => {

    users.push(socket);
    updateOnlineFile();

    io.emit("onlineCount", users.length);

    socket.on("join", () => {

        if (waitingUser && waitingUser !== socket) {

            socket.partner = waitingUser;
            waitingUser.partner = socket;

            socket.emit("connected");
            waitingUser.emit("connected");

            waitingUser = null;

        } else {
            waitingUser = socket;
            socket.emit("waiting");
        }

    });

    socket.on("message", (msg) => {
        if (socket.partner) {
            socket.partner.emit("message", msg);
        }
    });

    socket.on("next", () => {

        if (socket.partner) {
            socket.partner.emit("strangerLeft");
            socket.partner.partner = null;
        }

        socket.partner = null;
        waitingUser = socket;
        socket.emit("waiting");
    });

    socket.on("disconnect", () => {

        users = users.filter(u => u !== socket);
        updateOnlineFile();

        io.emit("onlineCount", users.length);

        if (socket.partner) {
            socket.partner.emit("strangerLeft");
            socket.partner.partner = null;
        }

        if (waitingUser === socket) {
            waitingUser = null;
        }
    });

});

// IMPORTANT
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

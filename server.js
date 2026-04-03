// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET","POST"]
  }
});

let waiting = [];

/* JOIN QUEUE */
function joinQueue(socket){

  // remove duplicates
  waiting = waiting.filter(s => s.id !== socket.id);

  if(waiting.length > 0){

    let partner = waiting.shift();

    let room = socket.id + "#" + partner.id;

    socket.join(room);
    partner.join(room);

    socket.room = room;
    partner.room = room;

    socket.emit("connected");
    partner.emit("connected");

  } else {
    waiting.push(socket);
    socket.emit("waiting");
  }
}

/* CONNECTION */
io.on("connection", (socket) => {

  console.log("User:", socket.id);

  socket.on("join", () => {
    joinQueue(socket);
  });

  socket.on("message", (msg) => {
    if(socket.room){
      socket.to(socket.room).emit("message", msg);
    }
  });

  socket.on("typing", () => {
    if(socket.room){
      socket.to(socket.room).emit("typing");
    }
  });

  socket.on("next", () => {

    if(socket.room){
      socket.to(socket.room).emit("strangerLeft");
      socket.leave(socket.room);
    }

    socket.room = null;

    // 🔥 instant requeue
    joinQueue(socket);
  });

  socket.on("disconnect", () => {

    waiting = waiting.filter(s => s.id !== socket.id);

    if(socket.room){
      socket.to(socket.room).emit("strangerLeft");
    }

    console.log("Disconnected:", socket.id);
  });

});

/* ONLINE COUNT */
setInterval(()=>{
  io.emit("onlineCount", io.engine.clientsCount);
},2000);

server.listen(3000, ()=>{
  console.log("Server running 🚀");
});

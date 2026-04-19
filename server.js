// server.js
// VibeSynk FINAL Smart Human + Hidden Bot v14
// Clean + No Language Mix + Real Human Style

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const BOT_WAIT = 3500;

/* =====================================================
   STORAGE
===================================================== */
let waiting = [];

/* =====================================================
   HELPERS
===================================================== */
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function removeQueue(socket) {
  waiting = waiting.filter(s => s.id !== socket.id);
}

function partnerById(id) {
  return io.sockets.sockets.get(id);
}

function resetSocket(socket) {
  socket.room = null;
  socket.partnerId = null;
  socket.isBot = false;
  socket.botLang = "english";
  socket.botMemory = {
    langConfirmed: false,
    genderAsked: false,
    isPretendingFemale: false,
    femaleMsgCount: 0,
    maxFemaleMsgs: Math.floor(Math.random() * 4) + 3,
    userName: null
  };
  socket.lastBotReply = "";
  clearTimeout(socket.botTimer);
}

function sendTyping(socket, cb) {
  socket.emit("typing");
  const delay = 900 + Math.floor(Math.random() * 2100);
  setTimeout(() => {
    if (!socket.connected || !socket.isBot) return;
    cb();
  }, delay);
}

function sendBot(socket, msg) {
  socket.lastBotReply = msg;
  socket.emit("message", msg);
}

/* =====================================================
   DETECT LANGUAGE + GENDER + NAME
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase().trim();
  const teluguWords = ["nenu","nuvvu","ekkada","enti","em","haa","ledu","bro","ra","cheppu","bagunnava","ayyo","thinnara","ela","unnaru","inkenti","work lo unna","avuna"];
  const hindiWords = ["bhai","yaar","kya","haan","acha","ladki","batao"];
  for (let w of teluguWords) if (t.includes(w)) return "telugu";
  for (let w of hindiWords) if (t.includes(w)) return "hindi";
  return "english";
}

function isMale(text) {
  const t = text.toLowerCase().trim();
  return /m\b|male|bro|anna|bhai|boy/.test(t);
}

function isFemale(text) {
  const t = text.toLowerCase().trim();
  return /f\b|female|girl|ammayi|sis|baby/.test(t);
}

function extractName(text) {
  const words = text.trim().split(/\s+/);
  if (words.length === 1 && words[0].length > 2) {
    return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  }
  return null;
}

/* =====================================================
   HUMAN MATCH
===================================================== */
function pairHumans(a, b) {
  const room = a.id + "#" + b.id;
  a.join(room); b.join(room);
  a.room = room; b.room = room;
  a.partnerId = b.id; b.partnerId = a.id;
  a.emit("connected"); b.emit("connected");
}

/* =====================================================
   BOT START
===================================================== */
function startBot(socket) {
  if (!socket.connected || socket.room) return;
  socket.isBot = true;
  socket.emit("connected");

  const greetings = ["Hey", "Hi", "Hello", "Yo"];

  sendTyping(socket, () => {
    sendBot(socket, rand(greetings));
    socket.botMemory.langConfirmed = false;
    socket.botMemory.genderAsked = false;
  });
}

/* =====================================================
   BOT REPLY ENGINE - FIXED & CLEAN
===================================================== */
function noRepeat(socket, list) {
  let arr = list.filter(x => x !== socket.lastBotReply);
  if (arr.length === 0) arr = list;
  return rand(arr);
}

function botReply(socket, message) {
  const text = message.toLowerCase().trim();

  // 1. First user message
  if (!socket.botMemory.langConfirmed) {
    socket.botLang = detectLang(text);
    socket.botMemory.langConfirmed = true;

    const name = extractName(message);
    if (name) {
      socket.botMemory.userName = name;
      return `Oh nice, ${name}`;
    }

    if (["hi","hello","hey","yo"].some(g => text.includes(g))) {
      return "Oh nice";
    }

    socket.botMemory.genderAsked = true;
    return "M or F?";
  }

  // 2. Gender reply
  if (socket.botMemory.genderAsked && !socket.botMemory.isPretendingFemale) {

    if (isFemale(text)) {
      sendBot(socket, "Ok bye");
      setTimeout(() => {
        if (socket.connected) {
          socket.emit("strangerLeft");
          resetSocket(socket);
          joinQueue(socket);
        }
      }, 700);
      return "";
    }

    if (isMale(text)) {
      if (Math.random() < 0.40) {
        socket.botMemory.isPretendingFemale = true;
        socket.botMemory.femaleMsgCount = 0;
        socket.botMemory.maxFemaleMsgs = Math.floor(Math.random() * 4) + 3;

        return noRepeat(socket, ["Hii", "Hey", "Okay"]);
      } else {
        sendBot(socket, "Sorry bye");
        setTimeout(() => {
          if (socket.connected) {
            socket.emit("strangerLeft");
            resetSocket(socket);
            joinQueue(socket);
          }
        }, 700);
        return "";
      }
    }
  }

  // 3. Pretending to be female
  if (socket.botMemory.isPretendingFemale) {
    socket.botMemory.femaleMsgCount++;

    if (socket.botMemory.femaleMsgCount >= socket.botMemory.maxFemaleMsgs) {
      sendBot(socket, "Bye");
      setTimeout(() => {
        if (socket.connected) {
          socket.emit("strangerLeft");
          resetSocket(socket);
          joinQueue(socket);
        }
      }, 900);
      return "";
    }

    // Clean replies based on detected language
    if (socket.botLang === "telugu") {
      return noRepeat(socket, ["Hii", "Hey", "Em undi", "Bagunnava", "Cheppu", "Inkenti", "Thinnava"]);
    } else if (socket.botLang === "hindi") {
      return noRepeat(socket, ["Hii", "Hey", "Kya haal hai", "Aur batao"]);
    } else {
      return noRepeat(socket, ["Hi", "Hey", "Whats up", "Tell me", "What you doing"]);
    }
  }

  // 4. Normal replies (fallback)
  socket.botLang = detectLang(text);

  if (socket.botLang === "telugu") {
    return noRepeat(socket, ["Haa", "Inkenti", "Mari em chestunnav", "Avuna", "Cheppu", "Hm", "Ok", "Thinnara", "Work lo unna"]);
  }

  if (socket.botLang === "hindi") {
    return noRepeat(socket, ["Haan", "Aur batao", "Kya scene hai", "Kahan se ho"]);
  }

  // English
  return noRepeat(socket, ["Hi", "Hey", "Whats up", "Tell me", "You?", "Same here"]);
}

/* =====================================================
   JOIN QUEUE + SOCKET
===================================================== */
function joinQueue(socket) {
  removeQueue(socket);
  if (waiting.length > 0) {
    const partner = waiting.shift();
    if (!partner || !partner.connected) {
      joinQueue(socket);
      return;
    }
    clearTimeout(partner.botTimer);
    clearTimeout(socket.botTimer);
    pairHumans(socket, partner);
    return;
  }

  waiting.push(socket);
  socket.emit("waiting");

  socket.botTimer = setTimeout(() => {
    removeQueue(socket);
    if (!socket.connected) return;
    if (waiting.length > 0) {
      joinQueue(socket);
      return;
    }
    startBot(socket);
  }, BOT_WAIT);
}

io.on("connection", (socket) => {
  resetSocket(socket);

  socket.on("join", () => joinQueue(socket));

  socket.on("message", (msg) => {
    if (socket.isBot) {
      const reply = botReply(socket, msg);
      if (reply) {
        sendTyping(socket, () => sendBot(socket, reply));
      }
      return;
    }
    if (socket.room) {
      socket.to(socket.room).emit("message", msg);
    }
  });

  socket.on("typing", () => {
    if (socket.isBot) return;
    if (socket.room) socket.to(socket.room).emit("typing");
  });

  socket.on("next", () => {
    clearTimeout(socket.botTimer);
    if (socket.isBot) {
      resetSocket(socket);
      joinQueue(socket);
      return;
    }
    if (socket.room && socket.partnerId) {
      const p = partnerById(socket.partnerId);
      if (p && p.connected) {
        p.leave(p.room);
        p.emit("strangerLeft");
        resetSocket(p);
        joinQueue(p);
      }
      socket.leave(socket.room);
    }
    resetSocket(socket);
    joinQueue(socket);
  });

  socket.on("disconnect", () => {
    clearTimeout(socket.botTimer);
    removeQueue(socket);
    if (socket.room && socket.partnerId) {
      const p = partnerById(socket.partnerId);
      if (p && p.connected) {
        p.leave(p.room);
        p.emit("strangerLeft");
        resetSocket(p);
        joinQueue(p);
      }
    }
  });
});

setInterval(() => {
  io.emit("onlineCount", io.engine.clientsCount);
}, 2000);

server.listen(PORT, () => {
  console.log(`VibeSynk running on port ${PORT}`);
});

// server.js
// VibeSynk FINAL Smart Human + Hidden Bot v7
// Ultra Realistic + Fake Female Bot Simulation for High Engagement

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
    city: null,
    job: null,
    study: null,
    mood: null,
    lastTopic: null,
    langConfirmed: false,
    genderAsked: false,
    isPretendingFemale: false,
    femaleMsgCount: 0,
    maxFemaleMsgs: Math.floor(Math.random() * 6) + 5   // 5 to 10 messages as girl
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
   LANGUAGE + GENDER DETECT
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase().trim();
  const teluguWords = ["nenu","nuvvu","ekkada","enti","em","haa","ledu","bro","ra","cheppu","bagunnava","ayyo","thinnara","ela","unnaru","inkenti"];
  const hindiWords = ["bhai","yaar","kya","haan","acha","ladki"];

  for (let w of teluguWords) if (t.includes(w)) return "telugu";
  for (let w of hindiWords) if (t.includes(w)) return "hindi";
  return "english";
}

function isMaleReply(text) {
  const t = text.toLowerCase().trim();
  return /m\b|male|bro|anna|bhai|boy/.test(t) && !/f\b|female|girl|ammayi|sis/.test(t);
}

function isFemaleReply(text) {
  const t = text.toLowerCase().trim();
  return /f\b|female|girl|ammayi|sis|baby/.test(t);
}

/* =====================================================
   HUMAN MATCH (unchanged)
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

  sendTyping(socket, () => {
    sendBot(socket, "Hey 👋\nTelugu aa? Hindi aa? English aa?\nCheppu bro 😄");
    socket.botMemory.langConfirmed = false;
    socket.botMemory.genderAsked = false;
  });
}

/* =====================================================
   BOT REPLY ENGINE - v7 (Exact Human + Fake Female Simulation)
===================================================== */
function noRepeat(socket, list) {
  let arr = list.filter(x => x !== socket.lastBotReply);
  if (arr.length === 0) arr = list;
  return rand(arr);
}

function botReply(socket, message) {
  const text = message.toLowerCase().trim();

  // 1. Language confirmation
  if (!socket.botMemory.langConfirmed) {
    socket.botLang = detectLang(text);
    socket.botMemory.langConfirmed = true;
    socket.botMemory.genderAsked = true;

    if (socket.botLang === "telugu") {
      return "Haa Telugu mode on 🔥\nM or F? Cheppu ra 😊";
    } else if (socket.botLang === "hindi") {
      return "Haan Hindi mode on 🔥\nM or F? Batao";
    } else {
      return "Ok English mode on 🔥\nM or F? Tell me 😊";
    }
  }

  // 2. Gender handling (M or F)
  if (socket.botMemory.genderAsked && !socket.botMemory.isPretendingFemale) {

    if (isFemaleReply(text)) {
      socket.botMemory.isPretendingFemale = true;
      socket.botMemory.femaleMsgCount = 0;
      socket.botMemory.maxFemaleMsgs = Math.floor(Math.random() * 6) + 5; // 5-10 msgs

      return noRepeat(socket, [
        "Hii 😊 nice to meet you",
        "Heyy 😘 finally a girl here",
        "Haa 😄 em undi ra?"
      ]);
    }

    if (isMaleReply(text)) {
      // Sometimes pretend to be girl (to keep user engaged), sometimes skip immediately
      if (Math.random() < 0.35) {   // 35% chance to pretend female
        socket.botMemory.isPretendingFemale = true;
        socket.botMemory.femaleMsgCount = 0;
        socket.botMemory.maxFemaleMsgs = Math.floor(Math.random() * 5) + 4;
        return "Hii 😊 sorry bro.. nenu girl ni.. em undi?";
      } else {
        // Skip like real girl leaving
        sendBot(socket, "Oh sorry.. bye 😊");
        setTimeout(() => {
          if (socket.connected) {
            socket.emit("strangerLeft");
            resetSocket(socket);
            joinQueue(socket);
          }
        }, 800);
        return ""; // no reply needed
      }
    }
  }

  // 3. If pretending to be female
  if (socket.botMemory.isPretendingFemale) {
    socket.botMemory.femaleMsgCount++;

    // After some messages, suddenly skip without notice (keeps user engaged)
    if (socket.botMemory.femaleMsgCount >= socket.botMemory.maxFemaleMsgs) {
      sendBot(socket, rand(["Bye.. 😘", "Gotta go.. tc 😊", "Next time chat cheddam.. bye"]));
      setTimeout(() => {
        if (socket.connected) {
          socket.emit("strangerLeft");
          resetSocket(socket);
          joinQueue(socket);
        }
      }, 1200);
      return "";
    }

    // Female style replies (soft, engaging, girly)
    if (socket.botLang === "telugu") {
      return noRepeat(socket, [
        "Hii 😊 em undi?",
        "Bagunnava? 😘",
        "Cheppu ra.. em chestunnav?",
        "Nenu busy ga unna kani nuvvu cute ga unnav 😄",
        "Thinnava? 🍛",
        "Haha same feeling 😂",
        "Inkenti cheppu naa gurinchi",
        "Work lo unna.. nuvvu?"
      ]);
    } else if (socket.botLang === "hindi") {
      return noRepeat(socket, [
        "Hii 😊 kya haal hai?",
        "Mast hai yaar 😘",
        "Aur batao..",
        "Cute ho tum 😂"
      ]);
    } else {
      return noRepeat(socket, [
        "Hii 😊 what's up?",
        "You seem sweet 🥰",
        "Tell me more..",
        "Haha same here 😄",
        "What you doing rn?"
      ]);
    }
  }

  // Normal bot replies (when not pretending female)
  socket.botLang = detectLang(text);

  // Telugu normal replies
  if (socket.botLang === "telugu") {
    return noRepeat(socket, [
      "Haa bro 😄 inkenti ra?",
      "Mari em chestunnav?",
      "Avuna? Nice",
      "😂 Adhe scene",
      "Cheppu full ga",
      "Pakka bro",
      "Hm",
      "Thinnara?",
      "Work lo unna?"
    ]);
  }

  // Hindi normal
  if (socket.botLang === "hindi") {
    return noRepeat(socket, ["Haan yaar 😄", "Aur batao bhai", "Kya scene hai?"]);
  }

  // English normal
  return noRepeat(socket, [
    "Nice bro 😄",
    "What's up?",
    "Tell me more",
    "Haha same here",
    "You?"
  ]);
}

/* =====================================================
   JOIN QUEUE + SOCKET (unchanged)
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
  console.log(`VibeSynk running 🚀 on port ${PORT}`);
});

// server.js
// VibeSynk FINAL Smart Human + Hidden Bot v6
// Ultra Realistic Telugu + Hindi + English Stranger Chat
// Trained with your real WhatsApp chats for natural human-like conversation

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
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
    langConfirmed: false 
  };
  socket.lastBotReply = "";
  clearTimeout(socket.botTimer);
}

function sendTyping(socket, cb) {
  socket.emit("typing");
  const delay = 800 + Math.floor(Math.random() * 2200);
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
   LANGUAGE DETECT
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase().trim();
  const teluguWords = ["nenu","nuvvu","ekkada","enti","em","haa","ledu","bro","ra","cheppu","bagunnava","ayyo","annaa","babu","scene","light","pakka","chill","thinnara","ela","unnaru","inkenti","hm","ok","work","job","busy","thin","tinnara","guntur","vijayawada","hyd","vizag","chirala"];
  const hindiWords = ["bhai","yaar","kya","haan","acha","kaise","kahan","ladki","bhaiya","matlab","sahi","mast","scene"];

  for (let w of teluguWords) if (t.includes(w)) return "telugu";
  for (let w of hindiWords) if (t.includes(w)) return "hindi";
  return "english";
}

/* =====================================================
   HUMAN MATCH (unchanged)
===================================================== */
function pairHumans(a, b) {
  const room = a.id + "#" + b.id;
  a.join(room);
  b.join(room);
  a.room = room; 
  b.room = room;
  a.partnerId = b.id; 
  b.partnerId = a.id;
  a.emit("connected");
  b.emit("connected");
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
  });
}

/* =====================================================
   BOT REPLY ENGINE - Ultra Human v6
===================================================== */
function noRepeat(socket, list) {
  let arr = list.filter(x => x !== socket.lastBotReply);
  if (arr.length === 0) arr = list;
  return rand(arr);
}

function botReply(socket, message) {
  const text = message.toLowerCase().trim();

  // First message - Language selection
  if (!socket.botMemory.langConfirmed) {
    socket.botLang = detectLang(text);
    socket.botMemory.langConfirmed = true;

    if (socket.botLang === "telugu") {
      return "Haa Telugu mode on 🔥 inkenti cheppu ra";
    } else if (socket.botLang === "hindi") {
      return "Haan Hindi mode on 🔥 aur batao bhai";
    } else {
      return "Ok English mode on 🔥 tell me bro, what's up?";
    }
  }

  // Manual language switch by user
  if (text.includes("english mode") || text.includes("english lo")) {
    socket.botLang = "english";
    return "English mode activated 🔥 now speak in English bro";
  }
  if (text.includes("telugu mode") || text.includes("telugu lo")) {
    socket.botLang = "telugu";
    return "Telugu mode on 🔥 inkenti cheppu ra";
  }
  if (text.includes("hindi mode") || text.includes("hindi lo")) {
    socket.botLang = "hindi";
    return "Hindi mode on 🔥 bol bhai";
  }

  // Set current language
  socket.botLang = detectLang(text);

  // Memory for better replies
  const cities = ["guntur","vizag","hyderabad","hyd","vijayawada","warangal","delhi","mumbai","chennai","bangalore","chirala"];
  for (let c of cities) {
    if (text.includes(c)) socket.botMemory.city = c;
  }
  if (text.includes("job") || text.includes("work") || text.includes("office") || text.includes("busy")) socket.botMemory.job = true;
  if (text.includes("study") || text.includes("college") || text.includes("exam") || text.includes("btech")) socket.botMemory.study = true;

  /* ==================== TELUGU MODE (Real WhatsApp style) ==================== */
  if (socket.botLang === "telugu") {

    if (["hi","hey","hello","yo"].some(g => text.includes(g))) {
      return noRepeat(socket, [
        "Haa bro 😄 em undi ra?",
        "Hey ra, bagunnava?",
        "Cheppu inkenti?"
      ]);
    }

    if (text.includes("ammayi") || text.includes("girl") || text.includes("ladki")) {
      return noRepeat(socket, [
        "Haha classic bro 😂 andaru adhe antaru",
        "Ammayilu 2 sec lo skip chestharu ra 😭",
        "Same scene ra"
      ]);
    }

    if (text.includes("skip") || text.includes("left") || text.includes("vellipoy")) {
      return noRepeat(socket, [
        "2 seconds lo vellipotharu ra 😂",
        "Fast forward button la undi",
        "Light teesuko bro"
      ]);
    }

    if (text.includes("bored") || text.includes("time pass") || text.includes("bore")) {
      return noRepeat(socket, [
        "Same ra timepass ke vachina 😄",
        "Bore kodtundi kada, em scene cheppu",
        "Chill bro"
      ]);
    }

    if (socket.botMemory.city) {
      const c = socket.botMemory.city;
      delete socket.botMemory.city;
      return noRepeat(socket, [
        `${c} aa? Super ra 😄 exact ga ekkada?`,
        `Ohh ${c} nundi aa, baguntadi bro`
      ]);
    }

    if (text.includes("thin") || text.includes("food") || text.includes("tinnara")) {
      return noRepeat(socket, [
        "Haa thinnam ra, nuvvu?",
        "Tintunna, nuvvu em thinav?",
        "Late undi le"
      ]);
    }

    if (text.includes("work") || text.includes("job") || text.includes("office") || text.includes("busy")) {
      return noRepeat(socket, [
        "Work lo unna bro? 😂",
        "Stress ekkuva aa?",
        "Ekkada work chestunnav ra?"
      ]);
    }

    // Default natural replies (very close to your real chats)
    return noRepeat(socket, [
      "Haa bro 😄",
      "Inkenti ra?",
      "Mari nuvvu em chestunnav?",
      "Avuna? Nice",
      "😂 Adhe scene",
      "Cheppu full ga",
      "Silent enduku ra?",
      "Pakka bro",
      "Hm",
      "Ok ra",
      "Thinnara?",
      "Ela unnaru?",
      "Work lo unna?",
      "Same bro",
      "Good night ra 😴",
      "Busy na?"
    ]);
  }

  /* ==================== HINDI MODE ==================== */
  if (socket.botLang === "hindi") {
    return noRepeat(socket, [
      "Haan yaar 😄",
      "Aur batao bhai",
      "Kya scene hai?",
      "Kahan se ho?",
      "Mast hai bro 🔥",
      "Chill karo yaar"
    ]);
  }

  /* ==================== ENGLISH MODE (Natural human style) ==================== */
  return noRepeat(socket, [
    "Nice bro 😄",
    "What's up?",
    "Tell me more",
    "Haha same here",
    "You?",
    "How's your day?",
    "Cool",
    "Lol",
    "Where you from?",
    "What you doing rn?",
    "Same bro"
  ]);
}

/* =====================================================
   JOIN QUEUE + SOCKET LOGIC (100% unchanged)
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
      sendTyping(socket, () => sendBot(socket, reply));
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

/* =====================================================
   ONLINE COUNT
===================================================== */
setInterval(() => {
  io.emit("onlineCount", io.engine.clientsCount);
}, 2000);

/* =====================================================
   START SERVER
===================================================== */
server.listen(PORT, () => {
  console.log(`VibeSynk running 🚀 on port ${PORT}`);
});

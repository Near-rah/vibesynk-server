// server.js
// VibeSynk v19 - Super Human-like Telugu Bot (Clean & Natural)

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const BOT_WAIT = 2800;

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
    stage: 0,                    // 0=greeting, 1=from, 2=name, 3=chatting
    isPretendingFemale: false,
    femaleMsgCount: 0,
    maxFemaleMsgs: Math.floor(Math.random() * 3) + 2,
    userName: null,
    userPlace: null,
    lastReplies: []
  };
  clearTimeout(socket.botTimer);
}

function sendTyping(socket, cb) {
  socket.emit("typing");
  setTimeout(() => {
    if (socket.connected && socket.isBot) cb();
  }, 800 + Math.floor(Math.random() * 1300));
}

function sendBot(socket, msg) {
  socket.lastBotReply = msg;
  socket.botMemory.lastReplies.push(msg);
  if (socket.botMemory.lastReplies.length > 5) socket.botMemory.lastReplies.shift();
  socket.emit("message", msg);
}

function noRepeat(socket, list) {
  let filtered = list.filter(x => !socket.botMemory.lastReplies.includes(x));
  return rand(filtered.length ? filtered : list);
}

/* =====================================================
   DETECTION
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase();
  if (/nenu|nuvvu|ekkada|enti|em|ledu|ra|rey|machha|macha|bava|bagunnava|thinnara|ayyo|inkenti|hyd|hyderabad|vizag|vijayawada|guntur/.test(t))
    return "telugu";
  if (/bhai|yaar|kya|haan|acha/.test(t)) return "hindi";
  return "english";
}

function detectPlace(text = "") {
  const t = text.toLowerCase();
  if (/hyd|hyderabad|secunderabad|warangal/.test(t)) return { state: "TS", name: "Hyd" };
  if (/guntur|vizag|visakhapatnam|vijayawada|nellore|kurnool|tirupati/.test(t)) return { state: "AP", name: "AP" };
  return null;
}

function isMale(text) {
  const t = text.toLowerCase();
  return /m\b|male|bro|machha|rey|ra|bhai|anna/.test(t);
}

function extractName(text) {
  const words = text.trim().split(/\s+/);
  if (words.length === 1 && words[0].length > 2 && !["hi","hello","hey","m","f","from"].includes(words[0].toLowerCase())) {
    return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  }
  return null;
}

/* =====================================================
   BOT START
===================================================== */
function startBot(socket) {
  if (!socket.connected) return;
  socket.isBot = true;
  socket.emit("connected");

  sendTyping(socket, () => {
    sendBot(socket, rand(["Hi", "Hey", "Hello machha"]));
    socket.botMemory.stage = 1;
  });
}

/* =====================================================
   MAIN BOT REPLY - Made Very Human-like
===================================================== */
function botReply(socket, message) {
  const text = message.toLowerCase().trim();
  const lang = detectLang(message);
  socket.botLang = lang;

  const placeInfo = detectPlace(message);
  const name = extractName(message);

  // Stage 1: After Hi → Ask from where
  if (socket.botMemory.stage === 1) {
    socket.botMemory.stage = 2;
    return lang === "telugu" 
      ? rand(["Ekkada machha?", "Nuvvu ekkada ra?"]) 
      : "From where?";
  }

  // Stage 2: React to place naturally + ask name
  if (socket.botMemory.stage === 2) {
    socket.botMemory.stage = 3;
    let reply = "";

    if (placeInfo) {
      socket.botMemory.userPlace = placeInfo;
      if (placeInfo.state === "TS") {
        reply = rand(["Oh Hyd ah machha", "Hyderabad aa? Same ra", "Kiraak bro"]);
      } else if (placeInfo.state === "AP") {
        reply = rand(["Oh AP ah ra", "Guntur side aa?", "AP machha nice"]);
      }
    } else {
      reply = rand(["Haa", "Achha", "Oh ok ra"]);
    }

    const ownPlace = placeInfo && placeInfo.state === "TS" 
      ? rand(["Nenu kuda Hyd lo unna", "Secunderabad side"]) 
      : placeInfo && placeInfo.state === "AP" 
      ? "Nenu AP lo unna ra" 
      : "Hyd lo unna bro";

    reply += `. ${ownPlace}. `;
    reply += rand(["Ne peru enti machha?", "Nuvvu evaru bro?", "Name cheppu ra"]);

    return reply;
  }

  // Stage 3: Name given
  if (name) {
    socket.botMemory.userName = name;
    socket.botMemory.stage = 4;

    if (isMale(message)) {
      return noRepeat(socket, [
        `Hi ${name} machha`,
        "Em chestunnav ra",
        "Scene emundi bro?",
        "Girls evaru leru aa time",
        "Boring undi ra",
        "Light ledu machha"
      ]);
    }
    return `Oh nice ${name}`;
  }

  // Gender check (Female)
  if (/f\b|female|girl|ammayi/.test(text)) {
    if (Math.random() < 0.25) {
      socket.botMemory.isPretendingFemale = true;
      socket.botMemory.femaleMsgCount = 0;
      return rand(["Hii 😊", "Heyy"]);
    } else {
      sendBot(socket, "Ok bye ra");
      setTimeout(() => disconnectBot(socket), 700);
      return "";
    }
  }

  // Normal casual chatting - Very natural & varied
  if (lang === "telugu") {
    return noRepeat(socket, [
      "Haa ra",
      "Em undi machha",
      "Inka em ledu",
      "Avuna bava",
      "Bagunnava?",
      "Thinnara bro?",
      "Work lo unna ra",
      "Scene ledu",
      "Light ledu machha",
      "Ayyo",
      "Cheppu rey",
      "Same here ra",
      "Kiraak undi",
      "Em chestunnav ra"
    ]);
  }

  if (lang === "hindi") {
    return noRepeat(socket, ["Haan bhai", "Aur batao yaar", "Kya haal hai"]);
  }

  // English fallback
  return noRepeat(socket, ["Hey", "Same here", "You?", "Haha", "Tell me bro"]);
}

function disconnectBot(socket) {
  if (socket.connected) {
    socket.emit("strangerLeft");
    resetSocket(socket);
    joinQueue(socket);
  }
}

/* =====================================================
   QUEUE & SOCKET EVENTS
===================================================== */
function joinQueue(socket) {
  removeQueue(socket);

  if (waiting.length > 0) {
    const partner = waiting.shift();
    if (partner && partner.connected) {
      clearTimeout(partner.botTimer);
      clearTimeout(socket.botTimer);
      const room = socket.id + "#" + partner.id;
      socket.join(room);
      partner.join(room);
      socket.room = room;
      partner.room = room;
      socket.partnerId = partner.id;
      partner.partnerId = socket.id;
      socket.emit("connected");
      partner.emit("connected");
      return;
    }
  }

  waiting.push(socket);
  socket.emit("waiting");

  socket.botTimer = setTimeout(() => {
    removeQueue(socket);
    if (socket.connected) {
      if (waiting.length === 0) {
        startBot(socket);
      } else {
        joinQueue(socket);
      }
    }
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
    if (!socket.isBot && socket.room) {
      socket.to(socket.room).emit("typing");
    }
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
  console.log(`VibeSynk v19 - Super Human-like running on port ${PORT}`);
});

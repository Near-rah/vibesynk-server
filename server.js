// server.js
// VibeSynk FINAL Smart Human + Hidden Bot v17 - Heavy Telugu Slang
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const BOT_WAIT = 3000;

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
    stage: 0,
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
  const delay = 700 + Math.floor(Math.random() * 1600);
  setTimeout(() => {
    if (socket.connected && socket.isBot) cb();
  }, delay);
}

function sendBot(socket, msg) {
  socket.lastBotReply = msg;
  socket.botMemory.lastReplies.push(msg);
  if (socket.botMemory.lastReplies.length > 5) socket.botMemory.lastReplies.shift();
  socket.emit("message", msg);
}

function noRepeat(socket, list) {
  let filtered = list.filter(x => !socket.botMemory.lastReplies.includes(x));
  return rand(filtered.length > 0 ? filtered : list);
}

/* =====================================================
   DETECTION
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase();
  if (/nenu|nuvvu|ekkada|enti|em|ledu|bro|ra|rey|cheppu|bagunnava|ayyo|thinnara|ela|unnaru|inkenti|machha|macha|bava|hyd|hyderabad|vizag|vijayawada/.test(t)) 
    return "telugu";
  if (/bhai|yaar|kya|haan|acha/.test(t)) return "hindi";
  return "english";
}

function detectPlace(text = "") {
  const t = text.toLowerCase().trim();
  if (/hyd|hyderabad|secunderabad|warangal|khammam/.test(t)) return {state: "TS", name: "Hyd"};
  if (/vizag|visakhapatnam|vijayawada|guntur|nellore|kurnool|tirupati/.test(t)) return {state: "AP", name: "AP"};
  return null;
}

function isMale(text) {
  const t = text.toLowerCase();
  return /m\b|male|bro|anna|bhai|boy|machha|rey|ra|dost|macha/.test(t);
}

function isFemale(text) {
  const t = text.toLowerCase();
  return /f\b|female|girl|ammayi|sis|baby|akka/.test(t);
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
   BOT REPLY ENGINE - Heavy Telugu Slang
===================================================== */
function botReply(socket, message) {
  const text = message.toLowerCase().trim();
  const lang = detectLang(message);
  socket.botLang = lang;

  const placeInfo = detectPlace(message);
  const name = extractName(message);

  // Stage 1: Ask from where
  if (socket.botMemory.stage === 1) {
    socket.botMemory.stage = 2;
    return lang === "telugu" ? rand(["Ekkada machha?", "Nuvvu ekkada bro?", "From where ra?"]) : 
           lang === "hindi" ? "Kahan se ho bhai?" : "From where?";
  }

  // Stage 2: React to place + own place + ask name
  if (socket.botMemory.stage === 2) {
    socket.botMemory.stage = 3;
    let reply = "";

    if (placeInfo) {
      socket.botMemory.userPlace = placeInfo;
      if (placeInfo.state === "TS") {
        reply = rand(["Oh Hyd ah machha", "Hyderabad aa? Kiraak ra", "Same Hyd bro"]);
      } else if (placeInfo.state === "AP") {
        reply = rand(["Oh AP ah ra", "AP side aa bava", "Vizag aa machha?"]);
      }
    } else {
      reply = rand(["Oh nice ra", "Achha machha", "Haa bava"]);
    }

    // Own place (match user if possible)
    const ownPlace = placeInfo && placeInfo.state === "TS" ? rand(["Nenu kuda Hyd lo ne unna", "Secunderabad side machha"]) :
                     placeInfo && placeInfo.state === "AP" ? rand(["Nenu AP lo unna ra", "Guntur side"]) :
                     rand(["Hyd lo unna bro", "Bangalore lo unna"]);

    reply += `. ${ownPlace}. `;

    // Ask name with slang
    reply += rand(["Ne peru enti machha?", "Name cheppu ra", "Nuvvu evaru bro?"]);

    return reply;
  }

  // Stage 3+: Name / Gender / Chat
  if (name) {
    socket.botMemory.userName = name;
    socket.botMemory.stage = 4;

    if (isMale(message)) {
      return noRepeat(socket, [
        `Hi ${name} machha`,
        "Em chestunnav ra",
        "Girls scene ledu bro ee time",
        "Ayyo boring undi ra, next search cheddama?"
      ]);
    }
    return `Oh nice ${name} machha`;
  }

  if (isFemale(text)) {
    if (Math.random() < 0.30) {
      socket.botMemory.isPretendingFemale = true;
      socket.botMemory.femaleMsgCount = 0;
      return rand(["Hii 😊", "Heyy machha"]);
    } else {
      sendBot(socket, "Ok bye ra");
      setTimeout(() => disconnectBot(socket), 700);
      return "";
    }
  }

  if (isMale(text)) {
    socket.botMemory.stage = 4;
    return noRepeat(socket, ["Haa machha", "Cheppu ra", "Em undi bro"]);
  }

  // Pretending Female (short & slangy)
  if (socket.botMemory.isPretendingFemale) {
    socket.botMemory.femaleMsgCount++;
    if (socket.botMemory.femaleMsgCount >= socket.botMemory.maxFemaleMsgs) {
      sendBot(socket, "Bye machha");
      setTimeout(() => disconnectBot(socket), 800);
      return "";
    }
    return noRepeat(socket, ["Hii", "Em undi", "Bagunnava?", "Inkenti ra"]);
  }

  // Normal Casual Chat - Heavy Telugu Slang
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
      "Same here ra",
      "Kiraak undi",
      "Cheppu rey"
    ]);
  }

  if (lang === "hindi") {
    return noRepeat(socket, ["Haan bhai", "Aur batao yaar", "Kya scene hai"]);
  }

  // English fallback with some slang mix
  return noRepeat(socket, ["Hey machha", "Same here ra", "You?", "Haha", "Tell me bro"]);
}

function disconnectBot(socket) {
  if (socket.connected) {
    socket.emit("strangerLeft");
    resetSocket(socket);
    joinQueue(socket);
  }
}

/* =====================================================
   QUEUE & EVENTS
===================================================== */
function joinQueue(socket) {
  removeQueue(socket);
  if (waiting.length > 0) {
    const partner = waiting.shift();
    if (partner && partner.connected) {
      clearTimeout(partner.botTimer);
      clearTimeout(socket.botTimer);
      pairHumans(socket, partner);
      return;
    }
  }

  waiting.push(socket);
  socket.emit("waiting");

  socket.botTimer = setTimeout(() => {
    removeQueue(socket);
    if (socket.connected) {
      if (waiting.length === 0) startBot(socket);
      else joinQueue(socket);
    }
  }, BOT_WAIT);
}

function pairHumans(a, b) {
  const room = a.id + "#" + b.id;
  a.join(room); b.join(room);
  a.room = room; b.room = room;
  a.partnerId = b.id; b.partnerId = a.id;
  a.emit("connected"); b.emit("connected");
}

io.on("connection", (socket) => {
  resetSocket(socket);
  socket.on("join", () => joinQueue(socket));

  socket.on("message", (msg) => {
    if (socket.isBot) {
      const reply = botReply(socket, msg);
      if (reply) sendTyping(socket, () => sendBot(socket, reply));
      return;
    }
    if (socket.room) socket.to(socket.room).emit("message", msg);
  });

  socket.on("typing", () => {
    if (!socket.isBot && socket.room) socket.to(socket.room).emit("typing");
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
  console.log(`VibeSynk v17 - Heavy Telugu Slang running on port ${PORT}`);
});

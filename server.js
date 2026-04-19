// server.js
// VibeSynk v24 - Ask M or F first, then Name only if F, Immediate Skip on M

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
    stage: 0,                    // 0=hi, 1=from, 2=place, 3=gender, 4=name (only if F)
    isPretendingFemale: false,
    femaleMsgCount: 0,
    maxFemaleMsgs: Math.floor(Math.random() * 4) + 3,
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
  if (/bhai|yaar|kya|haan/.test(t)) return "hindi";
  return "english";
}

function detectPlace(text = "") {
  const t = text.toLowerCase().trim();
  if (/hyd|hyderabad|secunderabad|warangal/.test(t)) return {state: "TS", name: "Hyd"};
  if (/guntur/.test(t)) return {state: "AP", name: "Guntur"};
  if (/vijayawada/.test(t)) return {state: "AP", name: "Vijayawada"};
  if (/vizag|visakhapatnam/.test(t)) return {state: "AP", name: "Vizag"};
  if (/nellore|kurnool|tirupati/.test(t)) return {state: "AP", name: "AP side"};
  return null;
}

function isMale(text) {
  const t = text.toLowerCase().trim();
  return /m\b|male|bro|machha|rey|ra|bhai|anna|boy/.test(t);
}

function isFemale(text) {
  const t = text.toLowerCase().trim();
  return /f\b|female|girl|ammayi|sis|baby|akka/.test(t);
}

function extractName(text) {
  const words = text.trim().split(/\s+/);
  if (words.length === 1 && words[0].length > 2 && !["hi","hello","hey","m","f","from","male","female"].includes(words[0].toLowerCase())) {
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
   BOT REPLY - M or F FIRST, Name only if F
===================================================== */
function botReply(socket, message) {
  const text = message.toLowerCase().trim();
  const lang = detectLang(message);
  socket.botLang = lang;

  const placeInfo = detectPlace(message);
  const name = extractName(message);

  // Stage 1: From where?
  if (socket.botMemory.stage === 1) {
    socket.botMemory.stage = 2;
    return lang === "telugu" ? rand(["Ekkada machha?", "Nuvvu ekkada ra?"]) : "From where?";
  }

  // Stage 2: Place reaction
  if (socket.botMemory.stage === 2) {
    socket.botMemory.stage = 3;
    socket.botMemory.userPlace = placeInfo;

    if (placeInfo) {
      if (placeInfo.state === "TS") return rand(["Oh Hyd ah machha", "Hyderabad aa? Same ra"]);
      if (placeInfo.name === "Guntur") return "Guntur aa? Nice ra";
      if (placeInfo.name === "Vijayawada") return "Vijayawada aa? Kiraak machha";
      if (placeInfo.name === "Vizag") return "Vizag aa bro?";
      return "AP ah ra? Nice";
    }
    return rand(["Haa", "Achha"]);
  }

  // Stage 3: Ask M or F?  (This is what you wanted first)
  if (socket.botMemory.stage === 3) {
    socket.botMemory.stage = 4;
    return "M or F?";
  }

  // Stage 4: Gender Check
  if (socket.botMemory.stage === 4) {

    // === MALE → Immediate Skip ===
    if (isMale(text)) {
      sendBot(socket, rand(["Haa machha", "Ok ra", "Scene ledu"]));

      setTimeout(() => {
        if (socket.connected) {
          sendBot(socket, "Bye ra");
          setTimeout(() => disconnectBot(socket), 800);
        }
      }, 1000);

      return "";
    }

    // === FEMALE → Ask Name + Pretend ===
    if (isFemale(text)) {
      if (Math.random() < 0.35) {
        socket.botMemory.isPretendingFemale = true;
        socket.botMemory.femaleMsgCount = 0;
        socket.botMemory.stage = 5;
        return rand(["Hii 😊", "Heyy"]);
      } else {
        sendBot(socket, "Ok bye ra");
        setTimeout(() => disconnectBot(socket), 700);
        return "";
      }
    }

    // If unclear
    return "M or F?";
  }

  // Stage 5: Female mode - Ask Name here
  if (socket.botMemory.stage === 5 && socket.botMemory.isPretendingFemale) {
    if (name) {
      socket.botMemory.userName = name;
      socket.botMemory.stage = 6;
      return `Oh nice ${name}`;
    }
    // If no name yet, ask for it
    return "Ne peru enti?";
  }

  // Female chatting (short)
  if (socket.botMemory.isPretendingFemale) {
    socket.botMemory.femaleMsgCount++;
    if (socket.botMemory.femaleMsgCount >= socket.botMemory.maxFemaleMsgs) {
      sendBot(socket, "Bye");
      setTimeout(() => disconnectBot(socket), 900);
      return "";
    }
    return noRepeat(socket, ["Hii", "Em undi", "Bagunnava?", "Inkenti"]);
  }

  // Normal fallback (should rarely reach here)
  if (lang === "telugu") {
    return noRepeat(socket, ["Haa ra", "Em undi machha", "Inka em ledu"]);
  }

  return "Haha";
}

function disconnectBot(socket) {
  if (socket.connected) {
    socket.emit("strangerLeft");
    resetSocket(socket);
    joinQueue(socket);
  }
}

/* =====================================================
   QUEUE & SOCKET
===================================================== */
function joinQueue(socket) {
  removeQueue(socket);

  if (waiting.length > 0) {
    const partner = waiting.shift();
    if (partner && partner.connected) {
      clearTimeout(partner.botTimer);
      clearTimeout(socket.botTimer);
      const room = socket.id + "#" + partner.id;
      socket.join(room); partner.join(room);
      socket.room = room; partner.room = room;
      socket.partnerId = partner.id; partner.partnerId = socket.id;
      socket.emit("connected"); partner.emit("connected");
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
  console.log(`VibeSynk v24 - M or F first + Skip on M running on port ${PORT}`);
});

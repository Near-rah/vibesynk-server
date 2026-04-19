// server.js
// VibeSynk FINAL Smart Human + Hidden Bot v15 - Updated Flow
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
    stage: 0,                    // 0 = greeting, 1 = from?, 2 = name/gender, 3 = chatting
    isPretendingFemale: false,
    femaleMsgCount: 0,
    maxFemaleMsgs: Math.floor(Math.random() * 4) + 3,
    userName: null,
    lastReplies: []              // to avoid repetition better
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
  socket.botMemory.lastReplies.push(msg);
  if (socket.botMemory.lastReplies.length > 3) socket.botMemory.lastReplies.shift();
  socket.emit("message", msg);
}

function noRepeat(socket, list) {
  let filtered = list.filter(x => !socket.botMemory.lastReplies.includes(x));
  return rand(filtered.length ? filtered : list);
}

/* =====================================================
   DETECT LANGUAGE + PLACE + GENDER
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase().trim();
  const teluguWords = ["nenu","nuvvu","ekkada","enti","em","haa","ledu","bro","ra","cheppu","bagunnava","ayyo","thinnara","ela","unnaru","inkenti","work lo","hyd","hyderabad","bangalore"];
  const hindiWords = ["bhai","yaar","kya","haan","acha","ladki","batao","kahan","kaise","ho"];
  for (let w of teluguWords) if (t.includes(w)) return "telugu";
  for (let w of hindiWords) if (t.includes(w)) return "hindi";
  return "english";
}

function detectPlace(text = "") {
  const t = text.toLowerCase();
  if (t.includes("hyd") || t.includes("hyderabad")) return "Hyderabad";
  if (t.includes("bangalore") || t.includes("bengaluru")) return "Bangalore";
  if (t.includes("chennai") || t.includes("madras")) return "Chennai";
  if (t.includes("mumbai") || t.includes("bombay")) return "Mumbai";
  if (t.includes("delhi")) return "Delhi";
  return null;
}

function isMale(text) {
  const t = text.toLowerCase().trim();
  return /m\b|male|bro|anna|bhai|boy|machha|rey|ra/.test(t);
}

function isFemale(text) {
  const t = text.toLowerCase().trim();
  return /f\b|female|girl|ammayi|sis|baby|akka/.test(t);
}

function extractName(text) {
  const words = text.trim().split(/\s+/);
  if (words.length === 1 && words[0].length > 2 && !["hi","hello","hey","from","m","f"].includes(words[0].toLowerCase())) {
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
   BOT START - Always starts with Hi
===================================================== */
function startBot(socket) {
  if (!socket.connected || socket.room) return;
  socket.isBot = true;
  socket.emit("connected");

  sendTyping(socket, () => {
    sendBot(socket, rand(["Hi", "Hey", "Hello"]));
    socket.botMemory.stage = 1;   // next will ask from where
  });
}

/* =====================================================
   IMPROVED BOT REPLY ENGINE
===================================================== */
function botReply(socket, message) {
  const text = message.toLowerCase().trim();
  const lang = detectLang(message);
  socket.botLang = lang;

  const place = detectPlace(message);
  const name = extractName(message);

  // Stage 1: After greeting → ask from where
  if (socket.botMemory.stage === 1) {
    socket.botMemory.langConfirmed = true;
    socket.botMemory.stage = 2;

    if (place) {
      return rand([
        `Oh ${place} ah bro`,
        `Oh nice, ${place} from?`,
        lang === "telugu" ? "Oh Hyd ah bro ekkada?" : "Oh from Hyderabad?"
      ]);
    }

    return lang === "telugu" ? "Ekkada bro?" :
           lang === "hindi" ? "Kahan se ho bhai?" :
           "From where?";
  }

  // Stage 2: Reply to "from" + say oh nice + share own place + ask name
  if (socket.botMemory.stage === 2) {
    socket.botMemory.stage = 3;

    let reply = "";

    if (place || lang === "telugu") {
      reply = rand([
        "Oh Telugu bro nice",
        "Oh Hyd ah bro, same vibe",
        "Oh nice ra",
        "Bagunnava bro"
      ]);
    } else if (lang === "hindi") {
      reply = rand([
        "Oh Hindi ha bhai",
        "Achha bhai, kya scene hai",
        "Yaar mast"
      ]);
    } else {
      reply = "Oh nice";
    }

    // Add own fake location
    const botPlaces = lang === "telugu" ? ["Hyderabad lo unna", "Secunderabad side"] :
                      lang === "hindi" ? ["Delhi se hu bhai", "Mumbai mein rehta"] :
                      ["Bangalore here", "From Pune actually"];

    reply += ". " + rand(botPlaces) + ". ";

    // Ask name
    reply += rand(["Ne peru enti?", "What's your name?", "Name cheppu bro", "Aur tera naam?"]);

    return reply;
  }

  // Gender / Name check (if user gives name or m/f)
  if (socket.botMemory.stage === 3) {
    if (name) {
      socket.botMemory.userName = name;
      socket.botMemory.stage = 4; // normal chat

      if (isMale(message) || isMale(name)) {
        // Male detected - casual talk then skip
        socket.botMemory.isPretendingFemale = false;
        return noRepeat(socket, [
          `Hi ${name} bro`,
          "Girls evaru leru bro ee time",
          "Single ah?",
          "Boring undi ra, next search cheddam?"
        ]);
      }

      return `Oh nice ${name}`;
    }

    // Direct m/f
    if (isFemale(text)) {
      if (Math.random() < 0.40) {
        socket.botMemory.isPretendingFemale = true;
        socket.botMemory.femaleMsgCount = 0;
        return noRepeat(socket, ["Hii 😊", "Heyy", "Okayy"]);
      } else {
        sendBot(socket, "Ok bye");
        setTimeout(() => disconnectBot(socket), 700);
        return "";
      }
    }

    if (isMale(text)) {
      socket.botMemory.stage = 4;
      return noRepeat(socket, ["Haa bro", "Cheppu ra", "Em undi"]);
    }
  }

  // 4. Pretending to be female (short lived)
  if (socket.botMemory.isPretendingFemale) {
    socket.botMemory.femaleMsgCount++;
    if (socket.botMemory.femaleMsgCount >= socket.botMemory.maxFemaleMsgs) {
      sendBot(socket, "Bye");
      setTimeout(() => disconnectBot(socket), 900);
      return "";
    }

    if (lang === "telugu") {
      return noRepeat(socket, ["Hii", "Em undi", "Bagunnava", "Cheppu ra", "Inkenti", "Thinnava?"]);
    } else if (lang === "hindi") {
      return noRepeat(socket, ["Hii", "Kya haal hai", "Aur batao yaar", "Kya kar rahi hu"]);
    } else {
      return noRepeat(socket, ["Hi", "Heyy", "Whats up?", "Tell me something", "You first"]);
    }
  }

  // 5. Normal casual chatting (zigzag variety)
  if (lang === "telugu") {
    return noRepeat(socket, [
      "Haa bro", "Inkenti", "Mari em chestunnav", "Avuna ra", "Cheppu", "Hm", "Ok ra",
      "Work lo unna", "Thinnara?", "Bagunnava", "Ekkada unnav", "Girls evaru unnaru?"
    ]);
  }

  if (lang === "hindi") {
    return noRepeat(socket, [
      "Haan bhai", "Aur batao", "Kya scene hai", "Kahan se ho", "Achha", "Mast hai",
      "Yaar kya kar raha hai", "Boring nahi lag raha?"
    ]);
  }

  // English fallback
  return noRepeat(socket, [
    "Hey", "Whats up", "Same here", "Tell me", "You?", "Nice", "Haha", "What you doing"
  ]);
}

function disconnectBot(socket) {
  if (socket.connected) {
    socket.emit("strangerLeft");
    resetSocket(socket);
    joinQueue(socket);
  }
}

/* =====================================================
   JOIN QUEUE + SOCKET EVENTS
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
  console.log(`VibeSynk v15 running on port ${PORT}`);
});

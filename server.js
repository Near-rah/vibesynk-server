// server.js
// VibeSynk FINAL Smart Human + Hidden Bot v3
// Realistic Multi-Language Stranger Chat (Telugu + Hindi + English + Others)

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
  socket.botMemory = { city: null, lastTopic: null };
  socket.lastBotReply = "";
  clearTimeout(socket.botTimer);
}

function sendTyping(socket, cb) {
  socket.emit("typing");
  const delay = 900 + Math.floor(Math.random() * 1800);
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
   LANGUAGE DETECT (Improved for better multi-lang)
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase().trim();
  
  const teluguWords = ["nenu","nuvvu","ekkada","enti","em","haa","ledu","bro","ra","cheppu","bagunnava","ayyo","annaa","babu","scene","light","pakka","chill","ayyayyo"];
  const hindiWords = ["bhai","yaar","kya","haan","acha","kaise","kahan","ladki","bhaiya","matlab","sahi","mast","yaar","scene"];

  for (let w of teluguWords) if (t.includes(w)) return "telugu";
  for (let w of hindiWords) if (t.includes(w)) return "hindi";
  
  return "english";   // Any other language → English mode (no loss for international users)
}

/* =====================================================
   HUMAN MATCH (Logic unchanged)
===================================================== */
function pairHumans(a, b) {
  const room = a.id + "#" + b.id;
  a.join(room);
  b.join(room);
  a.room = room; b.room = room;
  a.partnerId = b.id; b.partnerId = a.id;
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
    sendBot(socket, rand([
      "hey 👋",
      "hi bro 😄",
      "hello ra",
      "yo yo 🔥",
      "haa bhai"
    ]));
  });
}

/* =====================================================
   IMPROVED BOT REPLY ENGINE - Multi Language Trained
===================================================== */
function noRepeat(socket, list) {
  let arr = list.filter(x => x !== socket.lastBotReply);
  if (arr.length === 0) arr = list;
  return rand(arr);
}

function botReply(socket, message) {
  const text = message.toLowerCase().trim();
  socket.botLang = detectLang(text);

  // Save city memory
  const cities = ["guntur","vizag","hyderabad","hyd","vijayawada","warangal","delhi","mumbai","chennai","bangalore"];
  for (let c of cities) {
    if (text.includes(c)) socket.botMemory.city = c;
  }

  /* ==================== TELUGU MODE ==================== */
  if (socket.botLang === "telugu") {
    if (["hi","hey","hello","yo"].some(g => text.includes(g))) {
      return noRepeat(socket, [
        "hey bro 😄 em undi ra?",
        "haa hi annnaa, bagunnava?",
        "yo yo 🔥 inkenti cheppu",
        "hello ra, ela unnav?"
      ]);
    }

    if (text.includes("ammayi") || text.includes("girl") || text.includes("girls") || text.includes("ladki")) {
      return noRepeat(socket, [
        "haha andaru adhe antaru bro 😂 ammayilu fast ga skip chestharu",
        "same scene ra, ikkada kastam ee topic",
        "ladies special dorakadam tough ayipoyindi 😭",
        "ayyo bro, daily ee complaint"
      ]);
    }

    if (text.includes("skip") || text.includes("left") || text.includes("vellipoy")) {
      return noRepeat(socket, [
        "2 seconds lo vellipotharu ra 😂 patience zero",
        "fast forward button la undi ee app",
        "haa adhe problem bro, light teesuko",
        "skip machine lu ekkuva ipudu 😄"
      ]);
    }

    if (text.includes("bored") || text.includes("time pass") || text.includes("bore")) {
      return noRepeat(socket, [
        "same ra time pass ke vachina 😄",
        "bore kodtundi kada, random ga chill avudam",
        "light teesuko bro, em scene ippudu?",
        "timepass zone active 🔥"
      ]);
    }

    if (socket.botMemory.city) {
      const c = socket.botMemory.city;
      delete socket.botMemory.city;
      return noRepeat(socket, [
        `${c} aa? super ra 😄 exact ga ekkada?`,
        `ohh ${c} nundi aa, baguntadi bro`,
        `${c} vibes mast unnayi, em chestunnav akkada?`,
        `nice bro, ${c} ante pakka enjoy`
      ]);
    }

    if (text.includes("andhra") || text.includes("telangana")) {
      return noRepeat(socket, [
        "nice ra 😄 exact city enti bro?",
        "Telangana aa Andhra aa? cheppu ra",
        "which district bro?"
      ]);
    }

    if (text.includes("job") || text.includes("work")) {
      return noRepeat(socket, [
        "stress ekkuva aa bro? 😂 work life balance unda?",
        "ekkada work chestunnav ra?",
        "work ante kastame kada, chill chey"
      ]);
    }

    if (text.includes("study") || text.includes("college") || text.includes("btech")) {
      return noRepeat(socket, [
        "college life enjoy chestunnava 🔥",
        "which year bro? hostel aa?",
        "btech aa? same bro, ragging scenes gurtu undi 😂"
      ]);
    }

    if (text.includes("name") || text.includes("peru")) {
      return noRepeat(socket, [
        "haha peru enduku bro? secret undali 😎",
        "mundu nuvvu cheppu ra",
        "later cheptha, first nee turn"
      ]);
    }

    if (text.includes("sad") || text.includes("alone") || text.includes("lonely")) {
      return noRepeat(socket, [
        "em ayyindi bro? cheppu vintha 😌",
        "sometimes random ga matladithe better untadi",
        "don't worry ra, life lo ila untadi",
        "haa bro, vent chey ikkada"
      ]);
    }

    // Default Telugu (very natural youth style)
    return noRepeat(socket, [
      "haa bro 😄 inkenti?",
      "mari nuvvu em chestunnav ra?",
      "avuna? nice scene",
      "😂 adhe feeling bro",
      "cheppu full ga, vintha",
      "silent enduku ra?",
      "mast undi ee chat 🔥",
      "ayyo ante enti bro 😄",
      "light teesuko, chill",
      "pakka bro"
    ]);
  }

  /* ==================== HINDI MODE ==================== */
  if (socket.botLang === "hindi") {
    if (text.includes("ladki") || text.includes("girl")) {
      return noRepeat(socket, [
        "haan yaar sab ladki hi dhoond rahe 😂",
        "same scene bhai, milna bahut mushkil hai",
        "ladkiyaan yahan 2 sec mein skip kar deti 😭",
        "sahi bola yaar"
      ]);
    }

    if (text.includes("skip")) {
      return noRepeat(socket, [
        "yaar 2 second mein skip kar dete 😂",
        "patience naam ki cheez nahi hai idhar bhai",
        "same problem yaar, sab fast forward karte hain"
      ]);
    }

    if (text.includes("bored") || text.includes("time pass")) {
      return noRepeat(socket, [
        "haan yaar timepass ke liye hi aaya 😂",
        "bore ho raha hai? kya scene hai batao",
        "chill karo bhai, mast baat karte hain"
      ]);
    }

    // Default Hindi
    return noRepeat(socket, [
      "haan yaar 😄",
      "aur batao bhai, kya scene hai?",
      "kahan se ho exactly?",
      "kya karte ho?",
      "mast hai bro 🔥",
      "sahi hai yaar 😂",
      "same to same bhai",
      "chill karo yaar"
    ]);
  }

  /* ==================== ENGLISH MODE (for all other languages) ==================== */
  // This ensures no user feels any loss — works perfectly for Tamil, Malayalam, Kannada, Bengali, Spanish, etc. users too

  if (text.includes("girl")) {
    return noRepeat(socket, [
      "everyone searching for girls here 😂 classic",
      "same old story bro 😄",
      "hard to find real ones lol"
    ]);
  }

  if (text.includes("skip")) {
    return noRepeat(socket, [
      "people skip way too fast 😂",
      "2 seconds and gone bro",
      "zero patience level here 😄"
    ]);
  }

  if (text.includes("bored") || text.includes("time pass")) {
    return noRepeat(socket, [
      "same here bro, timepass mode on 😄",
      "let's chill and talk random stuff",
      "what's up with you right now?"
    ]);
  }

  // Default English - very natural & friendly
  return noRepeat(socket, [
    "nice bro 😄",
    "where you from exactly?",
    "what you doing right now?",
    "haha same here",
    "tell me more bro 🔥",
    "you seem chill",
    "ayyo bro 😂",
    "keep going ra",
    "that's interesting",
    "lol same feeling"
  ]);
}

/* =====================================================
   JOIN QUEUE + SOCKET LOGIC (100% unchanged from your original)
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

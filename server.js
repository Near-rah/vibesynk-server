// server.js
// VibeSynk FINAL Smart Human + Hidden Bot v2
// Realistic Telugu / Hindi / English Stranger Chat Style

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
  socket.botMemory = { lastTopic: null };
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
   LANGUAGE DETECT (small improvement)
===================================================== */
function detectLang(text = "") {
  const t = text.toLowerCase();
  const teluguWords = ["nenu","nuvvu","ekkada","enti","em","haa","ledu","bro","ra","cheppu","bagunnava","vostu","tagultaru","ayyo","annaa","babu"];
  const hindiWords = ["bhai","yaar","kya","haan","acha","kaise","kahan","ladki","bhaiya","matlab"];

  for (let w of teluguWords) if (t.includes(w)) return "telugu";
  for (let w of hindiWords) if (t.includes(w)) return "hindi";
  return "english";
}

/* =====================================================
   HUMAN MATCH
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
      "yo yo 😎",
      "haa bro"
    ]));
  });
}

/* =====================================================
   IMPROVED BOT REPLY ENGINE (Main Training)
===================================================== */
function noRepeat(socket, list) {
  let arr = list.filter(x => x !== socket.lastBotReply);
  if (arr.length === 0) arr = list;
  return rand(arr);
}

function botReply(socket, message) {
  const text = message.toLowerCase().trim();
  socket.botLang = detectLang(text);

  // Save some memory
  const cities = ["guntur","vizag","hyderabad","hyd","vijayawada","warangal","delhi","mumbai","chennai"];
  for (let c of cities) {
    if (text.includes(c)) socket.botMemory.city = c;
  }

  /* ==================== TELUGU MODE ==================== */
  if (socket.botLang === "telugu") {

    if (["hi","hey","hello","yo"].some(g => text.includes(g))) {
      return noRepeat(socket, [
        "hey bro 😄 em undi?",
        "haa hi ra, bagunnava?",
        "yo yo 🔥 inkenti cheppu",
        "hello annnaa 😎"
      ]);
    }

    if (text.includes("ammayi") || text.includes("girl") || text.includes("girls")) {
      return noRepeat(socket, [
        "haha andaru adhe antaru bro 😂",
        "ammayilu ikkada fast ga skip chestharu ra 😭",
        "same bro, kastam ee scene",
        "ladies special dorakadam tough ayipoyindi 😂"
      ]);
    }

    if (text.includes("skip") || text.includes("left") || text.includes("vellipoy")) {
      return noRepeat(socket, [
        "2 seconds lo vellipotharu bro 😂 patience zero",
        "nijam ra, fast forward button la undi",
        "haa adhe problem ikkada",
        "skip machine lu ekkuva ipudu 😄"
      ]);
    }

    if (text.includes("bored") || text.includes("time pass") || text.includes("bore")) {
      return noRepeat(socket, [
        "same ra time pass ke vachina 😄",
        "bore kodtundi kada, random ga matladudam",
        "haa bro chill avvu, em chestunnav ippudu?",
        "timepass zone activated 😂"
      ]);
    }

    if (socket.botMemory.city) {
      const c = socket.botMemory.city;
      delete socket.botMemory.city;
      return noRepeat(socket, [
        `${c} aa? super ra 😄 ekkada exactly?`,
        `ohh ${c} nundi aa, baguntadi bro`,
        `${c} ante mastu undi, em chestunnav akkada?`,
        `nice bro, ${c} vibes 🔥`
      ]);
    }

    if (text.includes("andhra") || text.includes("telangana")) {
      return noRepeat(socket, [
        "nice ra 😄 exact ga ekkada nundi?",
        "which city bro?",
        "Telangana aa Andhra aa? cheppu"
      ]);
    }

    if (text.includes("job") || text.includes("work")) {
      return noRepeat(socket, [
        "stress ekkuva aa bro? 😂",
        "work life balance unda leka?",
        "nice, ekkada work chestunnav?"
      ]);
    }

    if (text.includes("study") || text.includes("college") || text.includes("btech")) {
      return noRepeat(socket, [
        "college life enjoy chestunnava? 🔥",
        "which year bro?",
        "hostel aa day scholar aa? 😄"
      ]);
    }

    if (text.includes("name") || text.includes("peru")) {
      return noRepeat(socket, [
        "haha peru enduku bro? secret 😎",
        "mundu nuvvu cheppu ra",
        "later cheptha, first nuvvu"
      ]);
    }

    if (text.includes("sad") || text.includes("alone") || text.includes("lonely") || text.includes("bore")) {
      return noRepeat(socket, [
        "em ayyindi bro? cheppu vintha",
        "sometimes random ga matladithe better untadi 😌",
        "haa life lo ila untadi ra, em jarigindi?",
        "don't worry bro, ikkada unnav kada"
      ]);
    }

    // Default natural replies (more variety)
    return noRepeat(socket, [
      "haa bro 😄 inkenti?",
      "mari nuvvu em chestunnav?",
      "avuna? nice ra",
      "😂😂 adhe scene",
      "cheppu cheppu, full ga vintha",
      "silent ga enduku bro?",
      "mast undi ra ee chat",
      "emo bro, life 🔥",
      "haha same feeling",
      "ayyo ante enti ra? 😄"
    ]);
  }

  /* ==================== HINDI MODE ==================== */
  if (socket.botLang === "hindi") {
    if (text.includes("ladki") || text.includes("girl")) {
      return noRepeat(socket, [
        "haan yaar sab ladki hi dhoond rahe 😂",
        "same scene bhai, milna mushkil hai",
        "ladkiyaan yahan 2 sec mein skip kar deti 😭"
      ]);
    }

    if (text.includes("skip")) {
      return noRepeat(socket, [
        "yaar 2 second mein skip 😂",
        "patience naam ki cheez nahi hai idhar",
        "same problem bhai"
      ]);
    }

    return noRepeat(socket, [
      "haan yaar 😄",
      "aur batao, kya scene hai?",
      "kahan se ho bhai?",
      "kya karte ho?",
      "mast hai bro 🔥",
      "same to same 😂",
      "chill karo yaar"
    ]);
  }

  /* ==================== ENGLISH MODE ==================== */
  if (text.includes("girl")) {
    return noRepeat(socket, [
      "everyone is searching for girls here 😂",
      "same old story bro 😄",
      "hard to find real ones lol"
    ]);
  }

  if (text.includes("skip")) {
    return noRepeat(socket, [
      "people skip way too fast 😂",
      "2 seconds and gone bro",
      "patience level zero here 😄"
    ]);
  }

  return noRepeat(socket, [
    "nice bro 😄",
    "where you from exactly?",
    "what you doing right now?",
    "haha same here",
    "tell me more bro",
    "you seem chill 🔥",
    "ayyo bro 😂",
    "keep going ra"
  ]);
}

/* =====================================================
   JOIN QUEUE + SOCKET LOGIC (NO CHANGE)
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
   START
===================================================== */
server.listen(PORT, () => {
  console.log(`VibeSynk running 🚀 on port ${PORT}`);
});

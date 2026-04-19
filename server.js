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
  socket.botMemory = {};
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
   LANGUAGE DETECT
===================================================== */

function detectLang(text = "") {
  const t = text.toLowerCase();

  const teluguWords = [
    "nenu","nuvvu","ekkada","ekkadi","nundi","enti",
    "em","ha","haa","ledu","unna","bro","ra",
    "cheppu","bagunnava","vostu","tagultaru",
    "guntur","vizag","hyd","vijayawada"
  ];

  const hindiWords = [
    "mai","main","haan","kya","acha","kaise",
    "kahan","tum","yaar","bhai","delhi"
  ];

  for (let w of teluguWords) {
    if (t.includes(w)) return "telugu";
  }

  for (let w of hindiWords) {
    if (t.includes(w)) return "hindi";
  }

  return "english";
}

/* =====================================================
   HUMAN MATCH
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
    sendBot(socket, rand([
      "hey 👋",
      "hi bro 😄",
      "hello",
      "yo 😄",
      "hey"
    ]));
  });
}

/* =====================================================
   BOT REPLY ENGINE
===================================================== */

function noRepeat(socket, list) {
  let arr = list.filter(x => x !== socket.lastBotReply);
  if (arr.length === 0) arr = list;
  return rand(arr);
}

function botReply(socket, message) {

  const text = message.toLowerCase().trim();

  socket.botLang = detectLang(text);

  /* save city */
  const cities = [
    "guntur","vizag","hyderabad","hyd",
    "vijayawada","warangal","delhi",
    "mumbai","chennai"
  ];

  for (let c of cities) {
    if (text.includes(c)) socket.botMemory.city = c;
  }

  /* =================================================
     TELUGU MODE
  ================================================= */

  if (socket.botLang === "telugu") {

    /* greetings */
    if (
      text === "hi" || text === "hey" ||
      text === "hello" || text === "yo"
    ) {
      return noRepeat(socket, [
        "hey bro 😄",
        "haa hi",
        "hello bro",
        "hi 😄"
      ]);
    }

    /* no girls complaint */
    if (
      text.includes("ammayi") ||
      text.includes("girls") ||
      text.includes("girl")
    ) {
      return noRepeat(socket, [
        "haa bro 😂 andaru adhe antaru",
        "ammayilu dorakadam kastam bro 😄",
        "skip chesi vellipotharu emo 😂",
        "same complaint andharidi bro"
      ]);
    }

    /* skipped complaint */
    if (
      text.includes("skip") ||
      text.includes("left") ||
      text.includes("vellipoy")
    ) {
      return noRepeat(socket, [
        "nijam bro 😄 fast ga skip chestharu",
        "2 sec lo vellipotharu 😂",
        "patience undadu bro ikkada",
        "haa adhe scene"
      ]);
    }

    /* boredom */
    if (
      text.includes("time pass") ||
      text.includes("bored")
    ) {
      return noRepeat(socket, [
        "same bro timepass ke vachava 😄",
        "haa bore kodtundi kada",
        "andukey random chats 😂",
        "nice bro chill"
      ]);
    }

    /* city */
    if (socket.botMemory.city) {
      const c = socket.botMemory.city;
      delete socket.botMemory.city;

      return noRepeat(socket, [
        `${c} aa nice bro 😄`,
        `ohh ${c} nundi aa`,
        `${c} ante baguntadi bro`,
        `${c} aa.. inkenti em chestunnav`
      ]);
    }

    /* state */
    if (
      text.includes("andhra") ||
      text.includes("telangana")
    ) {
      return noRepeat(socket, [
        "nice bro 😄 ekkada nundi exactly?",
        "which city bro?",
        "haa nice.. district enti"
      ]);
    }

    /* job / study */
    if (
      text.includes("job") ||
      text.includes("work")
    ) {
      return noRepeat(socket, [
        "super bro 😄 stress ekkuva aa",
        "nice bro ekkada work",
        "work life ante kastame bro 😂"
      ]);
    }

    if (
      text.includes("study") ||
      text.includes("college") ||
      text.includes("btech")
    ) {
      return noRepeat(socket, [
        "nice bro 😄 which course",
        "college life enjoy chey bro 😂",
        "super bro hostel aa day scholar aa"
      ]);
    }

    /* name */
    if (
      text.includes("name") ||
      text.includes("na peru")
    ) {
      return noRepeat(socket, [
        "haha name enduku bro 😄",
        "cheptha later 😂",
        "mundu nuvvu cheppu bro"
      ]);
    }

    /* lonely/sad */
    if (
      text.includes("sad") ||
      text.includes("alone") ||
      text.includes("lonely")
    ) {
      return noRepeat(socket, [
        "em ayyindi bro",
        "cheppu vintha 😄",
        "sometimes ila matladithe better untadi",
        "haa life lo untadi bro"
      ]);
    }

    /* default real style */
    return noRepeat(socket, [
      "haa bro 😄",
      "inkenti cheppu",
      "mari nuvvu?",
      "avuna nice",
      "em chestunnav ippudu",
      "silent ga unnav 😂",
      "inka cheppu bro",
      "nice bro"
    ]);
  }

  /* =================================================
     HINDI MODE
  ================================================= */

  if (socket.botLang === "hindi") {

    if (
      text.includes("girl") ||
      text.includes("ladki")
    ) {
      return noRepeat(socket, [
        "haan yaar sab ladki hi dhoondte 😄",
        "same scene bro 😂",
        "milna mushkil hai yaar"
      ]);
    }

    if (
      text.includes("skip")
    ) {
      return noRepeat(socket, [
        "2 sec me skip kar dete 😂",
        "haan yaar patience nahi hai",
        "same problem bro"
      ]);
    }

    return noRepeat(socket, [
      "haan yaar 😄",
      "aur batao",
      "kahan se ho exactly?",
      "kya karte ho",
      "mast bro",
      "same 😂"
    ]);
  }

  /* =================================================
     ENGLISH MODE
  ================================================= */

  if (
    text.includes("girl")
  ) {
    return noRepeat(socket, [
      "everyone searching girls here 😂",
      "same old story bro 😄",
      "hard to find lol"
    ]);
  }

  if (
    text.includes("skip")
  ) {
    return noRepeat(socket, [
      "people skip too fast 😂",
      "2 seconds and gone lol",
      "same issue here 😄"
    ]);
  }

  return noRepeat(socket, [
    "nice bro 😄",
    "where you from exactly?",
    "what you doing now",
    "haha same",
    "tell bro 😄",
    "you seem chill"
  ]);
}

/* =====================================================
   JOIN QUEUE
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

/* =====================================================
   SOCKET
===================================================== */

io.on("connection", (socket) => {

  resetSocket(socket);

  socket.on("join", () => {
    joinQueue(socket);
  });

  socket.on("message", (msg) => {

    if (socket.isBot) {

      const reply = botReply(socket, msg);

      sendTyping(socket, () => {
        sendBot(socket, reply);
      });

      return;
    }

    if (socket.room) {
      socket.to(socket.room).emit("message", msg);
    }
  });

  socket.on("typing", () => {

    if (socket.isBot) return;

    if (socket.room) {
      socket.to(socket.room).emit("typing");
    }
  });

  socket.on("next", () => {

    clearTimeout(socket.botTimer);

    /* bot chat */
    if (socket.isBot) {
      resetSocket(socket);
      joinQueue(socket);
      return;
    }

    /* human chat */
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
  console.log("VibeSynk running 🚀 " + PORT);
});

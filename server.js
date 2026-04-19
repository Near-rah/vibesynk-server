// server.js
// VibeSynk Hybrid Human + Hidden Bot Backend
// Works with your current frontend unchanged

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

/* =====================================================
   CONFIG
===================================================== */

const PORT = process.env.PORT || 3000;
const BOT_WAIT_TIME = 4000; // wait before bot joins if no human found

/* =====================================================
   STORAGE
===================================================== */

let waiting = []; // real users waiting only

/* =====================================================
   BOT DATA
===================================================== */

const bots = [
  { name: "casual" },
  { name: "funny" },
  { name: "friendly" },
  { name: "genz" },
  { name: "flirty" },
  { name: "deep" }
];

const teluguReplies = [
  "haa bro 😄",
  "nuvvu ekkadi?",
  "em chestunnav ippudu",
  "nice ra",
  "bagundi 😄",
  "hyd vachava eppudaina?",
  "haha nijama 😂",
  "inka cheppu"
];

const hindiReplies = [
  "haan yaar 😄",
  "kahan se ho?",
  "kya kar rahe ho",
  "sahi hai 😄",
  "mast 😂",
  "aur batao",
  "same yaar",
  "acha nice"
];

const englishReplies = [
  "haha nice 😄",
  "where you from?",
  "what's up",
  "same here lol",
  "tell me more",
  "fr? 😂",
  "nice vibe",
  "you seem cool"
];

const deepReplies = [
  "life lately ela undi?",
  "sab thik chal raha?",
  "you happy these days?",
  "sometimes random talks help 😄",
  "what's on your mind?"
];

/* =====================================================
   HELPERS
===================================================== */

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function removeFromQueue(socket) {
  waiting = waiting.filter(s => s.id !== socket.id);
}

function getHumanWaitingCount() {
  return waiting.length;
}

function cleanSocket(socket) {
  socket.room = null;
  socket.partnerId = null;
  socket.isBotChat = false;
  socket.botTimer = null;
}

function pairHumans(a, b) {
  const room = a.id + "#" + b.id;

  a.join(room);
  b.join(room);

  a.room = room;
  b.room = room;

  a.partnerId = b.id;
  b.partnerId = a.id;

  a.isBotChat = false;
  b.isBotChat = false;

  a.emit("connected");
  b.emit("connected");
}

function findPartnerById(id) {
  return io.sockets.sockets.get(id);
}

/* =====================================================
   LANGUAGE DETECTION
===================================================== */

function detectLang(text = "") {
  const t = text.toLowerCase();

  const teluguWords = [
    "nenu","nuvvu","ekkadi","em","enti","ledu",
    "unna","hyd","ra","bro","bagunnava","cheppu"
  ];

  const hindiWords = [
    "mai","main","kya","kaise","haan","acha",
    "kahan","tum","mera","bhai","yaar"
  ];

  for (let w of teluguWords) {
    if (t.includes(w)) return "telugu";
  }

  for (let w of hindiWords) {
    if (t.includes(w)) return "hindi";
  }

  return "english";
}

function getBotReply(socket, userMsg) {
  const lang = socket.botLang || detectLang(userMsg);
  socket.botLang = lang;

  const low = userMsg.toLowerCase();

  if (
    low.includes("sad") ||
    low.includes("lonely") ||
    low.includes("bored") ||
    low.includes("life") ||
    low.includes("depressed")
  ) {
    return random(deepReplies);
  }

  if (lang === "telugu") return random(teluguReplies);
  if (lang === "hindi") return random(hindiReplies);

  return random(englishReplies);
}

/* =====================================================
   BOT CONNECT
===================================================== */

function connectBot(socket) {
  if (!socket.connected) return;
  if (socket.room) return;
  if (socket.isBotChat) return;

  socket.isBotChat = true;
  socket.botLang = "english";
  socket.emit("connected");

  setTimeout(() => {
    if (socket.connected && socket.isBotChat) {
      socket.emit("typing");
    }
  }, 800);

  setTimeout(() => {
    if (socket.connected && socket.isBotChat) {
      socket.emit("message", random([
        "hey 👋",
        "hi 😄",
        "hello",
        "yo what's up",
        "hey where you from?"
      ]));
    }
  }, 1800);
}

/* =====================================================
   QUEUE LOGIC
===================================================== */

function joinQueue(socket) {
  removeFromQueue(socket);

  // human available?
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

  // no human found
  waiting.push(socket);
  socket.emit("waiting");

  socket.botTimer = setTimeout(() => {
    removeFromQueue(socket);

    // if another human arrived meanwhile, don't bot connect
    if (getHumanWaitingCount() > 0) {
      joinQueue(socket);
      return;
    }

    connectBot(socket);

  }, BOT_WAIT_TIME);
}

/* =====================================================
   SOCKET EVENTS
===================================================== */

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  cleanSocket(socket);

  /* JOIN */
  socket.on("join", () => {
    joinQueue(socket);
  });

  /* MESSAGE */
  socket.on("message", (msg) => {

    // BOT CHAT
    if (socket.isBotChat) {

      const reply = getBotReply(socket, msg);

      setTimeout(() => {
        if (socket.connected && socket.isBotChat) {
          socket.emit("typing");
        }
      }, 700);

      setTimeout(() => {
        if (socket.connected && socket.isBotChat) {
          socket.emit("message", reply);
        }
      }, 1800);

      return;
    }

    // HUMAN CHAT
    if (socket.room) {
      socket.to(socket.room).emit("message", msg);
    }
  });

  /* TYPING */
  socket.on("typing", () => {

    if (socket.isBotChat) return;

    if (socket.room) {
      socket.to(socket.room).emit("typing");
    }
  });

  /* NEXT / SKIP */
  socket.on("next", () => {

    clearTimeout(socket.botTimer);

    // if bot chat
    if (socket.isBotChat) {
      socket.isBotChat = false;
      socket.room = null;
      socket.partnerId = null;
      joinQueue(socket);
      return;
    }

    // human chat
    if (socket.room && socket.partnerId) {

      const partner = findPartnerById(socket.partnerId);

      if (partner && partner.connected) {
        partner.leave(partner.room);
        partner.room = null;
        partner.partnerId = null;
        partner.emit("strangerLeft");

        joinQueue(partner);
      }

      socket.leave(socket.room);
    }

    socket.room = null;
    socket.partnerId = null;

    joinQueue(socket);
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {

    clearTimeout(socket.botTimer);

    removeFromQueue(socket);

    if (socket.room && socket.partnerId) {

      const partner = findPartnerById(socket.partnerId);

      if (partner && partner.connected) {
        partner.leave(partner.room);
        partner.room = null;
        partner.partnerId = null;
        partner.emit("strangerLeft");

        joinQueue(partner);
      }
    }

    console.log("Disconnected:", socket.id);
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
  console.log("VibeSynk server running 🚀 on port " + PORT);
});

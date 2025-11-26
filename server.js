// server.js
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

// Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));

// simple health endpoint
app.get("/health", (req, res) => res.send("OK"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let waitingUser = null;

function updateOnlineCount() {
  io.emit("online-count", io.engine.clientsCount);
}

io.on("connection", (socket) => {
  console.log("connect:", socket.id);
  updateOnlineCount();

  socket.on("find-partner", () => {
    console.log("find-partner:", socket.id);
    // if someone waiting and not same socket
    if (waitingUser && waitingUser.id !== socket.id) {
      // pair them
      const a = socket;
      const b = waitingUser;

      a.partnerId = b.id;
      b.partnerId = a.id;

      a.emit("partner", b.id);
      b.emit("partner", a.id);

      console.log("paired:", a.id, "<->", b.id);
      waitingUser = null;
    } else {
      // set as waiting
      waitingUser = socket;
      socket.partnerId = null;
      console.log("set waiting:", socket.id);
    }
    updateOnlineCount();
  });

  socket.on("signal", (data) => {
    // forward to partner
    if (!data || !data.partnerId) return;
    io.to(data.partnerId).emit("signal", {
      signal: data.signal,
      from: socket.id
    });
  });

  socket.on("next", () => {
    console.log("next from", socket.id);
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("end");
      const p = io.sockets.sockets.get(socket.partnerId);
      if (p) p.partnerId = null;
    }
    // put current socket to waiting
    socket.partnerId = null;
    waitingUser = socket;
    updateOnlineCount();
  });

  socket.on("disconnect", () => {
    console.log("disconnect:", socket.id);
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("end");
      const p = io.sockets.sockets.get(socket.partnerId);
      if (p) p.partnerId = null;
    }
    if (waitingUser && waitingUser.id === socket.id) waitingUser = null;
    updateOnlineCount();
  });
});

// PORT from environment (Render) or 10000 for local testing
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

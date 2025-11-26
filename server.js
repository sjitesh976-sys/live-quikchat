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

let waitingUser = null;

// total online count update
function updateOnlineCount() {
  io.emit("online-count", io.engine.clientsCount);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  updateOnlineCount();

  // Find partner
  if (waitingUser) {
    socket.partnerId = waitingUser.id;
    waitingUser.partnerId = socket.id;

    socket.emit("partner", waitingUser.id);
    waitingUser.emit("partner", socket.id);

    waitingUser = null;
  } else {
    waitingUser = socket;
  }

  // WebRTC signal exchange
  socket.on("signal", (data) => {
    io.to(data.partnerId).emit("signal", {
      signal: data.signal,
      from: socket.id
    });
  });

  // Next button handling
  socket.on("next", () => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("end");
    }
    waitingUser = socket;
  });

  // On disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    updateOnlineCount();

    if (socket.partnerId) {
      io.to(socket.partnerId).emit("end");
    }
    if (waitingUser === socket) waitingUser = null;
  });
});

// Server port
server.listen(10000, () => {
  console.log("Server is running on port 10000");
});

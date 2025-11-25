
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Match user
  if (!waitingUser) {
    waitingUser = socket;
    socket.emit("waiting");
  } else {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.emit("match", waitingUser.id);
    waitingUser.emit("match", socket.id);

    waitingUser = null;
  }

  // OFFER relay
  socket.on("offer", (data) => {
    if (socket.partner) socket.partner.emit("offer", { sdp: data });
  });

  // ANSWER relay
  socket.on("answer", (data) => {
    if (socket.partner) socket.partner.emit("answer", { sdp: data });
  });

  // ICE relay
  socket.on("ice", (candidate) => {
    if (socket.partner) socket.partner.emit("ice", candidate);
  });

  // Next user
  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("disconnected");
      socket.partner.partner = null;
    }
    socket.partner = null;

    if (!waitingUser) waitingUser = socket;
    else {
      socket.partner = waitingUser;
      waitingUser.partner = socket;

      socket.emit("match", waitingUser.id);
      waitingUser.emit("match", socket.id);

      waitingUser = null;
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.partner) {
      socket.partner.emit("disconnected");
      socket.partner.partner = null;
    }
    if (waitingUser === socket) waitingUser = null;

    console.log("User disconnected:", socket.id);
  });
});

// Static files
app.use(express.static(path.join(__dirname)));

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Server running on port", PORT));

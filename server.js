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

  if (waitingUser) {
    io.to(socket.id).emit("match", waitingUser);
    io.to(waitingUser).emit("match", socket.id);
    waitingUser = null;
  } else {
    waitingUser = socket.id;
  }

  socket.on("offer", (data) => {
    io.to(data.target).emit("offer", { sdp: data.sdp, from: socket.id });
  });

  socket.on("answer", (data) => {
    io.to(data.target).emit("answer", { sdp: data.sdp });
  });

  socket.on("ice", (data) => {
    io.to(data.target).emit("ice", data.candidate);
  });

  socket.on("next", () => {
    waitingUser = socket.id;
    socket.emit("waiting");
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) waitingUser = null;
    console.log("User disconnected:", socket.id);
  });
});

// Static files
app.use(express.static(path.join(__dirname)));

// Main HTML route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Server listen
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Server running on port " + PORT));

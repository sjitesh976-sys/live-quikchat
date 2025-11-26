const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let waitingUser = null;

io.on("connection", socket => {
  console.log("user", socket.id);

  socket.emit("online-count", io.engine.clientsCount);

  socket.on("find-partner", () => {
    if (!waitingUser) {
      waitingUser = socket.id;
      socket.emit("waiting");
    } else {
      io.to(socket.id).emit("partner-found", { partner: waitingUser });
      io.to(waitingUser).emit("partner-found", { partner: socket.id });
      waitingUser = null;
    }
  });

  socket.on("offer", data => io.to(data.partner).emit("offer", { offer:data.offer, sender:socket.id }));
  socket.on("answer", data => io.to(data.partner).emit("answer", { answer:data.answer }));
  socket.on("ice", data => io.to(data.partner).emit("ice", { candidate:data.candidate }));

  socket.on("chat-message", data => io.to(data.partner).emit("chat-message", { message:data.message }));

  socket.on("next", () => {
    io.to(socket.id).emit("waiting");
    waitingUser = socket.id;
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) waitingUser = null;
    socket.broadcast.emit("partner-disconnected");
  });
});

app.use(express.static(path.join(__dirname)));

app.get("/", (req,res)=> res.sendFile(path.join(__dirname, "index.html")));

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("SERVER on", PORT));

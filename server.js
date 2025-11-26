const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*"
  }
});

app.use(express.static('public'));

io.on("connection", (socket) => {
  console.log("User connected");
  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", msg);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

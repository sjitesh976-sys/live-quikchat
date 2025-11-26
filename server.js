const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let waitingUser = null;

// store active pairs so we know who is connected to whom
const pairs = {}; // { socketId: partnerId }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // find partner
  socket.on("findPartner", () => {
    if (waitingUser && waitingUser !== socket.id) {
      io.to(socket.id).emit("partnerFound", waitingUser);
      io.to(waitingUser).emit("partnerFound", socket.id);

      // store pair
      pairs[socket.id] = waitingUser;
      pairs[waitingUser] = socket.id;

      waitingUser = null;
    } else {
      waitingUser = socket.id;
      console.log("User waiting:", socket.id);
    }
  });

  // WebRTC exchange
  socket.on("offer", (data) => {
    io.to(data.partnerId).emit("offer", {
      offer: data.offer,
      sender: socket.id,
    });
  });

  socket.on("answer", (data) => {
    io.to(data.partnerId).emit("answer", {
      answer: data.answer,
      sender: socket.id,
    });
  });

  socket.on("ice-candidate", (data) => {
    io.to(data.partnerId).emit("ice-candidate", data.candidate);
  });

  // handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (waitingUser === socket.id) waitingUser = null;

    const partnerId = pairs[socket.id];
    if (partnerId) {
      io.to(partnerId).emit("partnerDisconnected", socket.id);
      delete pairs[partnerId];
      delete pairs[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

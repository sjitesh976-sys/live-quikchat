import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("findPartner", () => {
    if (waitingUser) {
      io.to(socket.id).emit("partnerFound", waitingUser);
      io.to(waitingUser).emit("partnerFound", socket.id);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  socket.on("offer", (data) => {
    io.to(data.partner).emit("offer", data.sdp);
  });

  socket.on("answer", (data) => {
    io.to(data.partner).emit("answer", data.sdp);
  });

  socket.on("iceCandidate", (data) => {
    io.to(data.partner).emit("iceCandidate", data.candidate);
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) waitingUser = null;
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));

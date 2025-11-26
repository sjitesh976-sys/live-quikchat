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

  // Find Partner
  socket.on("findPartner", () => {
    if (waitingUser && waitingUser !== socket.id) {
      io.to(socket.id).emit("partnerFound", waitingUser);
      io.to(waitingUser).emit("partnerFound", socket.id);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
      console.log("Waiting user:", waitingUser);
    }
  });

  // Offer SDP
  socket.on("offer", (data) => {
    io.to(data.partner).emit("offer", {
      sdp: data.sdp,
      from: socket.id
    });
  });

  // Answer SDP
  socket.on("answer", (data) => {
    io.to(data.partner).emit("answer", {
      sdp: data.sdp,
      from: socket.id
    });
  });

  // ICE Candidate
  socket.on("iceCandidate", (data) => {
    io.to(data.partner).emit("iceCandidate", data.candidate);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (waitingUser === socket.id) waitingUser = null;
    socket.broadcast.emit("partnerDisconnected");
  });
});

server.listen(3000, () => console.log("🚀 Server running on port 3000"));

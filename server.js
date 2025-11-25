import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const port = process.env.PORT || 3000;

// HTTP server
const server = app.listen(port, () => {
  console.log("Server running on port " + port);
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("User connected");

  socket.on("message", (msg) => {
    socket.send(msg);
  });
}

import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files (optional)
app.get("/", (req, res) => {
  res.send("WebRTC Signaling Server is Running");
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket Server
const wss = new WebSocketServer({ server });

let waitingUser = null;

wss.on("connection", (ws) => {
  console.log("User connected");

  // Pair users
  if (!waitingUser) {
    waitingUser = ws;
    ws.send(JSON.stringify({ type: "waiting" }));
  } else {
    // Pair both users
    ws.partner = waitingUser;
    waitingUser.partner = ws;

    waitingUser.send(JSON.stringify({ type: "matched" }));
    ws.send(JSON.stringify({ type: "matched" }));

    waitingUser = null;
  }

  // Handle messages
  ws.on("message", (message) => {
    if (ws.partner) {
      ws.partner.send(message.toString());
    }
  });

  // Handle disconnect
  ws.on("close", () => {
    if (ws.partner) {
      ws.partner.send(JSON.stringify({ type: "partner-disconnected" }));
      ws.partner.partner = null;
    }

    if (waitingUser === ws) {
      waitingUser = null;
    }

    console.log("User disconnected");
  });
});

const connectBtn = document.getElementById("connectBtn");

connectBtn.addEventListener("click", () => {
    console.log("Searching for next user...");
    // Yaha pe hum matching logic add karenge
});async function startChat() {
    document.getElementById("videos").style.display = "block";

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    document.getElementById("myVideo").srcObject = stream;

    alert("Random partner match system coming soon!");
}
const nextBtn = document.getElementById("connectBtn");

nextBtn.addEventListener("click", () => {
  ws.close(); 
  location.reload();
});
const express = require("express");
const app = express();
const server = app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

const WebSocket = require("ws");
const wss = new WebSocket.Server({ server });

let waitingUser = null;

wss.on("connection", (ws) => {
  console.log("New user connected");

  if (waitingUser) {
    // Pair with waiting user
    ws.partner = waitingUser;
    waitingUser.partner = ws;

    ws.send(JSON.stringify({ type: "match" }));
    waitingUser.send(JSON.stringify({ type: "match" }));

    waitingUser = null;
  } else {
    waitingUser = ws;
  }

  ws.on("message", (data) => {
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
      ws.partner.send(data);
    }
  });

  ws.on("close", () => {
    console.log("User disconnected");
    if (ws.partner) {
      ws.partner.send(JSON.stringify({ type: "leave" }));
      ws.partner.partner = null;
    }
    if (waitingUser === ws) waitingUser = null;
  });
});

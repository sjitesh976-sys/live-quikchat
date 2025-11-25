 const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ⭐ Public files (HTML, CSS, JS) serve karne ke liye
app.use(express.static(__dirname));

// ⭐ Default: index.html kholega
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// WebRTC signaling
io.on("connection", (socket) => {
    console.log("User Connected: " + socket.id);

    socket.on("findPartner", () => {
        socket.broadcast.emit("partnerFound", socket.id);
    });

    socket.on("offer", (data) => {
        socket.to(data.to).emit("offer", data);
    });

    socket.on("answer", (data) => {
        socket.to(data.to).emit("answer", data);
    });

    socket.on("iceCandidate", (data) => {
        socket.to(data.to).emit("iceCandidate", data);
    });
});

// Server start
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log("WebRTC Signaling Server Running on Port " + PORT);
});

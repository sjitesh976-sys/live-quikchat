// CONNECT TO SOCKET SERVER
const socket = io("https://live-quikchatz.onrender.com", {
  transports: ["websocket", "polling"]
});

// DOM ELEMENTS
const onlineCount = document.getElementById("online-count");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");

// GLOBALS
let peerConnection;
let localStream;

// WebRTC Config
const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ]
};

// Listen Online Users
socket.on("onlineUsers", (count) => {
  onlineCount.innerText = count;
});

// Start Button
startBtn.addEventListener("click", async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;

  waitForPartner();
});

// Wait for Partner
function waitForPartner() {
  socket.emit("findPartner");
  startBtn.disabled = true;
}

// When partner found
socket.on("partnerFound", async () => {
  peerConnection = new RTCPeerConnection(configuration);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", event.candidate);
    }
  };

  createOffer();
});

// Create offer
async function createOffer() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);
}

// Receive offer
socket.on("offer", async (offer) => {
  peerConnection = new RTCPeerConnection(configuration);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", event.candidate);
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

// Receive answer
socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Receive ICE candidate
socket.on("iceCandidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (err) {
    console.error("ICE Error:", err);
  }
});

// Disconnect button
stopBtn.addEventListener("click", () => {
  socket.emit("disconnectUser");
  location.reload();
});

// public/script.js
// Random 1:1 WebRTC using Socket.io (Omegle-style)
// Paste this file into your public/ folder and replace old script.js

const socket = io(); // assumes socket.io client script is loaded in index.html

// DOM
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const findBtn = document.getElementById("findBtn");
const debugDiv = document.getElementById("debug");

// State
let localStream = null;
let pc = null;
let partnerId = null;
let isMakingOffer = false;

// STUN servers (public). Add TURN if you have one.
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Debug logger
function log(msg, ...args) {
  console.log(msg, ...args);
  if (debugDiv) {
    const p = document.createElement("div");
    p.textContent = typeof msg === "string" ? msg : JSON.stringify(msg);
    debugDiv.prepend(p);
  }
}

//
// 🚀 FIXED START CAMERA FUNCTION
//
async function startCamera() {
  try {
    log("Requesting camera & microphone permission...");

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",   // Always open front camera
      },
    });

    localVideo.srcObject = localStream;
    localVideo.muted = true;
    await localVideo.play();
    log("Local camera started successfully");
  } catch (err) {
    log("Camera / Microphone error:", err);
    alert(
      "Camera or Mic blocked or used by another app!\n" +
      "Please:\n- Close other apps (WhatsApp, Instagram, Recorder etc)\n" +
      "- Give Chrome camera permissions\n" +
      "- Refresh the page"
    );
  }
}

// Create peer connection
function createPeerConnection() {
  if (pc) return pc;

  pc = new RTCPeerConnection(RTC_CONFIG);

  // Add tracks
  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  const remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  pc.addEventListener("track", (evt) => {
    if (evt.streams && evt.streams[0]) {
      remoteVideo.srcObject = evt.streams[0];
    } else {
      remoteStream.addTrack(evt.track);
    }
  });

  pc.addEventListener("icecandidate", (event) => {
    if (event.candidate && partnerId) {
      socket.emit("ice-candidate", { candidate: event.candidate, partnerId });
    }
  });

  return pc;
}

// Found partner
socket.on("partnerFound", async (id) => {
  partnerId = id;
  createPeerConnection();

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { offer, partnerId });
  } catch (err) {
    log("Offer creation error:", err);
  }
});

// Received offer
socket.on("offer", async ({ offer, sender }) => {
  partnerId = sender;
  createPeerConnection();

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { answer, partnerId });
  } catch (err) {
    log("Error handling offer:", err);
  }
});

// Received answer
socket.on("answer", async ({ answer }) => {
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (err) {
    log("Error setting answer:", err);
  }
});

// ICE candidate
socket.on("ice-candidate", async (candidate) => {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    log("Error adding ICE candidate:", err);
  }
});

// Partner disconnected
socket.on("partnerDisconnected", () => {
  cleanupPeer();
  alert("Partner disconnected.");
});

startBtn.onclick = async () => {
  if (!localStream) await startCamera();
};

findBtn.onclick = async () => {
  if (!localStream) await startCamera();
  cleanupPeer();
  socket.emit("findPartner");
};

function cleanupPeer() {
  if (pc) {
    pc.close();
    pc = null;
  }
  partnerId = null;
  remoteVideo.srcObject = null;
}

socket.on("connect", () => {
  log("Connected to server:", socket.id);
});

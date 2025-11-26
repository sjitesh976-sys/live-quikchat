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
let polite = false; // not strictly needed for simple one-to-one, kept for collision handling

// STUN servers (public). Add TURN if you have one.
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// simple logger to page + console
function log(msg, ...args) {
  console.log(msg, ...args);
  if (debugDiv) {
    const p = document.createElement("div");
    p.textContent = typeof msg === "string" ? msg : JSON.stringify(msg);
    debugDiv.prepend(p);
  }
}

// Start camera (call on user click)
async function startCamera() {
  try {
    log("Requesting camera & microphone permission...");
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
    });

    localVideo.srcObject = localStream;
    localVideo.muted = true;
    await localVideo.play();
    log("Local camera started");
  } catch (err) {
    log("Camera / Microphone error:", err);
    alert("Camera / Microphone not allowed! Check permissions & refresh.");
  }
}

// Create peer connection and wire events
function createPeerConnection() {
  if (pc) return pc;

  pc = new RTCPeerConnection(RTC_CONFIG);

  // Add local tracks
  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  // Remote tracks -> remoteVideo
  const remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  pc.addEventListener("track", (evt) => {
    // evt.streams[0] may be present
    if (evt.streams && evt.streams[0]) {
      log("Got remote stream from evt.streams[0]");
      remoteVideo.srcObject = evt.streams[0];
    } else {
      log("Got remote track, adding to MediaStream");
      remoteStream.addTrack(evt.track);
      remoteVideo.srcObject = remoteStream;
    }
  });

  // ICE candidates -> send to partner
  pc.addEventListener("icecandidate", (event) => {
    if (event.candidate && partnerId) {
      log("Sending ICE candidate to", partnerId);
      socket.emit("ice-candidate", { candidate: event.candidate, partnerId });
    }
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    log("ICE state:", pc.iceConnectionState);
    if (pc.iceConnectionState === "failed") {
      log("ICE failed — trying restart (if supported)");
      pc.restartIce && pc.restartIce();
    }
  });

  return pc;
}

// When partner found by server
socket.on("partnerFound", async (id) => {
  log("Partner found:", id);
  partnerId = id;

  // Create PC and make offer
  createPeerConnection();

  try {
    isMakingOffer = true;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { offer, partnerId });
    log("Sent offer to", partnerId);
  } catch (err) {
    log("Offer creation error:", err);
  } finally {
    isMakingOffer = false;
  }
});

// When we receive an offer from someone
socket.on("offer", async (data) => {
  const { offer, sender } = data;
  log("Received offer from", sender);
  partnerId = sender;

  createPeerConnection();

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { answer, partnerId });
    log("Sent answer to", partnerId);
  } catch (err) {
    log("Error handling offer:", err);
  }
});

// When we receive an answer (for the offer we sent)
socket.on("answer", async (data) => {
  const { answer, sender } = data;
  log("Received answer from", sender);
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    log("Remote description set (answer)");
  } catch (err) {
    log("Error setting remote description (answer):", err);
  }
});

// ICE candidates from partner
socket.on("ice-candidate", async (candidate) => {
  log("Received ICE candidate:", candidate);
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
    log("Added ICE candidate");
  } catch (err) {
    log("Error adding ICE candidate (may be during setting remote desc):", err);
  }
});

// When partner disconnects (server will emit 'partnerDisconnected' if implemented)
socket.on("partnerDisconnected", (id) => {
  log("Partner disconnected:", id);
  cleanupPeer();
  alert("Partner disconnected.");
});

// Button handlers
startBtn.onclick = async () => {
  if (!localStream) {
    await startCamera();
  } else {
    log("Camera already started");
  }
};

findBtn.onclick = async () => {
  if (!localStream) {
    // try to start camera immediately before finding partner
    await startCamera();
    if (!localStream) {
      log("Cannot find partner: camera not started");
      return;
    }
  }

  // Clean any existing connection and then ask server to find a partner
  cleanupPeer();
  socket.emit("findPartner");
  log("Searching for partner...");
};

// Clean up peer connection (but keep localStream)
function cleanupPeer() {
  if (pc) {
    try {
      pc.close();
    } catch (e) {}
    pc = null;
  }
  partnerId = null;
  if (remoteVideo) {
    remoteVideo.srcObject = null;
  }
}

// When the socket reconnects, reset state
socket.on("connect", () => {
  log("Connected to signalling server:", socket.id);
});

// If server asks to show debug logs
socket.on("log", (m) => log("Server: " + m));

// Optional: handle page unload to close tracks & socket
window.addEventListener("beforeunload", () => {
  try {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
  } catch (e) {}
  socket.close();
});

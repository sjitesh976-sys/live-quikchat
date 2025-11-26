const socket = io();

// DOM elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const findBtn = document.getElementById("findBtn");
const nextBtn = document.getElementById("nextBtn");

let peerConnection;
let partnerId;
let localStream;

// ===== START CAMERA BUTTON =====
startBtn.addEventListener("click", async () => {
  try {
    console.log("Requesting camera...");
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    localVideo.srcObject = localStream;
    console.log("Camera Started Successfully");
  } catch (err) {
    console.error("Camera Error:", err);

    if (err.name === "NotAllowedError") {
      alert("Camera/Microphone blocked! Please allow permissions from browser settings.");
    } else if (err.name === "NotFoundError") {
      alert("No camera or mic found on this device.");
    } else {
      alert("Error: " + err.message);
    }
  }
});

// ===== SEARCH PARTNER =====
findBtn.addEventListener("click", async () => {
  await startLocalStreamIfNeeded();
  startSearching();
});

nextBtn?.addEventListener("click", () => {
  cleanupConnection();
  startSearching();
});

async function startLocalStreamIfNeeded() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  }
}

function startSearching() {
  console.log("Searching for partner...");
  socket.emit("findPartner");
}

// ===== WHEN PARTNER MATCHED =====
socket.on("partnerFound", async (id) => {
  console.log("Matched with:", id);
  partnerId = id;

  await startLocalStreamIfNeeded();
  await createPeerConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { sdp: offer, partner: partnerId });
});

// ===== RECEIVE OFFER =====
socket.on("offer", async (data) => {
  console.log("Offer received");

  partnerId = data.from;

  await startLocalStreamIfNeeded();
  await createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { sdp: answer, partner: partnerId });
});

// ===== RECEIVE ANSWER =====
socket.on("answer", async (data) => {
  console.log("Answer received");
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
});

// ===== RECEIVE ICE =====
socket.on("iceCandidate", async (data) => {
  if (data.candidate) {
    console.log("ICE received");
    try {
      await peerConnection.addIceCandidate(data.candidate);
    } catch (e) {
      console.error("ICE error:", e);
    }
  }
});

// ===== PARTNER DISCONNECT =====
socket.on("partnerDisconnected", () => {
  console.log("Partner disconnected");
  cleanupConnection();
});

// ===== HELPER FUNCTIONS =====
async function createPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  localStream.getTracks().forEach((track) =>
    peerConnection.addTrack(track, localStream)
  );

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", { candidate: event.candidate, partner: partnerId });
    }
  };
}

function cleanupConnection() {
  if (peerConnection) peerConnection.close();
  peerConnection = null;
  partnerId = null;
  remoteVideo.srcObject = null;
}

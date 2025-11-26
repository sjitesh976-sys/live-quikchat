const socket = io();

// DOM elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const findBtn = document.getElementById("findBtn");
const nextBtn = document.getElementById("nextBtn");

let peerConnection;
let partnerId;
let localStream;

// ===== Start / Find Partner =====
findBtn.addEventListener("click", () => {
  startSearching();
});

nextBtn.addEventListener("click", () => {
  cleanupConnection();
  startSearching();
});

function startSearching() {
  console.log("Searching Partner...");
  socket.emit("findPartner");
}

// ===== When Partner Found =====
socket.on("partnerFound", async (id) => {
  console.log("Matched with:", id);
  partnerId = id;

  await startLocalStream();
  await createPeerConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { sdp: offer, partner: partnerId });
});

// ===== Receive Offer =====
socket.on("offer", async (data) => {
  console.log("Offer received");

  partnerId = data.from;

  await startLocalStream();
  await createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { sdp: answer, partner: partnerId });
});

// ===== Receive Answer =====
socket.on("answer", async (data) => {
  console.log("Answer received");
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
});

// ===== Receive ICE =====
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

// ===== Partner Disconnect =====
socket.on("partnerDisconnected", () => {
  console.log("Partner disconnected");
  cleanupConnection();
});

// ===== Helper Functions =====
async function startLocalStream() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  }
}

async function createPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

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

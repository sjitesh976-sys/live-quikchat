const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("nextBtn");

let socket = io("/");
let peerConnection;
let partnerId;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

async function start() {
  // Camera / Mic access
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = stream;

  // Create RTCPeerConnection
  peerConnection = new RTCPeerConnection(config);

  // Add tracks for streaming
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  // When we receive remote stream
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // ICE exchange
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && partnerId) {
      socket.emit("ice", { candidate: event.candidate, partner: partnerId });
    }
  };

  // Ask server to find a partner
  socket.emit("find-partner");
}

// When server matches us
socket.on("partner-found", async (data) => {
  partnerId = data.partner;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { offer, partner: partnerId });
});

// When receiving an offer
socket.on("offer", async (data) => {
  partnerId = data.sender;

  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { answer, partner: partnerId });
});

// When receiving answer
socket.on("answer", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// When receiving ICE candidate
socket.on("ice", async (data) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (e) {
    console.error("ICE error", e);
  }
});

// Next button refresh partner system
nextBtn.addEventListener("click", () => {
  location.reload();
});

// Start system
start();

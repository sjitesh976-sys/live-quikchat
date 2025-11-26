
const socket = io("https://live-quikchat-u.onrender.com");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("nextBtn");

let peerConnection;
let localStream;
let currentTarget = null;

// STUN Servers (working worldwide)
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" }
  ]
};

async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true, audio: true
  });
  localVideo.srcObject = localStream;
  localVideo.muted = true;
}

start();

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit("ice", { candidate, target: currentTarget });
    }
  };
}

// Socket Events
socket.on("match", async (partnerId) => {
  currentTarget = partnerId;
  createPeerConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { sdp: offer, target: partnerId });
});

socket.on("offer", async ({ sdp, from }) => {
  currentTarget = from;
  createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { sdp: answer, target: from });
});

socket.on("answer", async ({ sdp }) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
});

socket.on("ice", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("ICE error:", err);
  }
});

nextBtn.addEventListener("click", () => {
  location.reload(); // simple working reset
});

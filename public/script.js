
const socket = io();
let localStream;
let remoteStream;
let peerConnection;

const config = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] }
  ],
};

async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;
  } catch (err) {
    alert("Camera / Microphone not allowed!");
  }
}

document.getElementById("startBtn").addEventListener("click", () => {
  startCamera();
});

document.getElementById("findBtn").addEventListener("click", async () => {
  peerConnection = new RTCPeerConnection(config);

  remoteStream = new MediaStream();
  document.getElementById("remoteVideo").srcObject = remoteStream;

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", { partner: partnerId, candidate: event.candidate });
    }
  };

  socket.emit("findPartner");
});

let partnerId;

socket.on("partnerFound", async (id) => {
  partnerId = id;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { partner: partnerId, sdp: offer });
});

socket.on("offer", async (sdp) => {
  partnerId = socket.id;

  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { partner: partnerId, sdp: answer });
});

socket.on("answer", async (sdp) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
});

socket.on("iceCandidate", async (candidate) => {
  await peerConnection.addIceCandidate(candidate);
});

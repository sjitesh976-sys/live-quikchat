const socket = io();
let localStream;
let remoteStream;
let peerConnection;

const config = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] }
  ],
};

// Debug alerts
socket.on("connect", () => alert("Socket connected: " + socket.id));
socket.on("partnerFound", () => alert("Partner Found!"));
socket.on("partnerDisconnected", () => alert("Partner Disconnected!"));
socket.on("offer", () => console.log("Offer received"));
socket.on("answer", () => console.log("Answer received"));
socket.on("ice-candidate", () => console.log("ICE Candidate received"));

async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    document.getElementById("localVideo").srcObject = localStream;
  } catch (err) {
    alert("Camera / Microphone not allowed!");
  }
}

// Start Camera Button
document.getElementById("startBtn").addEventListener("click", () => {
  startCamera();
});

// FIND PARTNER BUTTON
document.getElementById("findBtn").addEventListener("click", async () => {
  console.log("Find button clicked");
  socket.emit("findPartner");   // IMPORTANT FIX
  peerConnection = new RTCPeerConnection(config);

  remoteStream = new MediaStream();
  document.getElementById("remoteVideo").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };
});

// OFFER
socket.on("partnerFound", async () => {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);
});

// RECEIVE OFFER
socket.on("offer", async (offer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

// RECEIVE ANSWER
socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// ICE
socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (err) {
    console.error("ICE error", err);
  }
});

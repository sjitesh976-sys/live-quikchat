const socket = io();
let localStream;
let peerConnection;
let partnerId;

// Buttons:
document.getElementById("startBtn").onclick = startCamera;
document.getElementById("findBtn").onclick = () => {
  socket.emit("findPartner");
};

async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    const localVideo = document.getElementById("localVideo");
    localVideo.srcObject = localStream;
    localVideo.muted = true;
    await localVideo.play();
    console.log("Camera started");
  } catch (err) {
    console.error("Camera Error:", err);
  }
}

socket.on("partnerFound", async (id) => {
  console.log("Partner found:", id);
  partnerId = id;
  await createConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer, partnerId });
});

socket.on("offer", async ({ offer, sender }) => {
  partnerId = sender;
  await createConnection();
  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { answer, partnerId });
});

socket.on("answer", async (data) => {
  await peerConnection.setRemoteDescription(data.answer);
});

socket.on("ice-candidate", (candidate) => {
  if (peerConnection && candidate) {
    peerConnection.addIceCandidate(candidate);
  }
});

async function createConnection() {
  peerConnection = new RTCPeerConnection();
  
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    document.getElementById("remoteVideo").srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        candidate: event.candidate,
        partnerId
      });
    }
  };
}

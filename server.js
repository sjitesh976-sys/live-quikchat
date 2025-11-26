const socket = io();

// DOM elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const findBtn = document.getElementById("findBtn");

let peerConnection;
let partnerId;

// Button Find Partner
findBtn.addEventListener("click", () => {
  console.log("Find Partner clicked");
  socket.emit("findPartner");
});

// Partner Found Response (From Server)
socket.on("partnerFound", async (id) => {
  console.log("Matched with:", id);
  partnerId = id;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = stream;

  peerConnection = new RTCPeerConnection();

  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", {
        candidate: event.candidate,
        partner: partnerId
      });
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    sdp: offer,
    partner: partnerId
  });
});

// Receive Offer
socket.on("offer", async ({ sdp, from }) => {
  partnerId = from;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = stream;

  peerConnection = new RTCPeerConnection();

  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", {
        candidate: event.candidate,
        partner: partnerId
      });
    }
  };

  await peerConnection.setRemoteDescription(sdp);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", {
    sdp: answer,
    partner: partnerId
  });

  console.log("Answer sent");
});

// Receive Answer
socket.on("answer", async ({ sdp }) => {
  console.log("Answer received");
  await peerConnection.setRemoteDescription(sdp);
});

// Receive ICE Candidate
socket.on("iceCandidate", async (candidate) => {
  console.log("ICE Candidate received");
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (e) {
    console.error("Error adding candidate:", e);
  }
});

// Partner Disconnected
socket.on("partnerDisconnected", () => {
  alert("❌ Partner disconnected");
  if (peerConnection) peerConnection.close();
  remoteVideo.srcObject = null;
});

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

// Partner Found From Server
socket.on("partnerFound", async (id) => {
  console.log("Matched with:", id);
  partnerId = id;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  localVideo.srcObject = stream;

  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  });

  // Add Local Stream Tracks
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  // Remote Stream
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Send ICE Candidate
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", {
        candidate: event.candidate,
        partner: partnerId,
      });
    }
  };

  // Create Offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    sdp: offer,
    partner: partnerId,
  });
});

// Receive Offer
socket.on("offer", async (data) => {
  console.log("Offer received from:", data.from);

  partnerId = data.from;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  localVideo.srcObject = stream;

  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  });

  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", {
        candidate: event.candidate,
        partner: partnerId,
      });
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", {
    sdp: answer,
    partner: partnerId,
  });
});

// Receive Answer
socket.on("answer", async (data) => {
  console.log("Answer received");
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
});

// Receive ICE Candidate
socket.on("iceCandidate", async (data) => {
  console.log("ICE Candidate received");
  try {
    await peerConnection.addIceCandidate(data.candidate);
  } catch (e) {
    console.error("Error adding ICE", e);
  }
});

// Partner Disconnected
socket.on("partnerDisconnected", () => {
  console.log("Partner disconnected");
  alert("Partner disconnected. Try again.");
  window.location.reload();
});


const socket = io();

// DOM elements
const video = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const findBtn = document.getElementById("findBtn");

let peerConnection;

findBtn.addEventListener("click", () => {
  console.log("Find button clicked");
  socket.emit("find");
});

// When matched with another user
socket.on("match", async (userId) => {
  console.log("Matched with user:", userId);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  video.srcObject = stream;

  peerConnection = new RTCPeerConnection();
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { offer, to: userId });
});

socket.on("offer", async ({ offer, from }) => {
  console.log("Received offer");
  peerConnection = new RTCPeerConnection();

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  video.srcObject = stream;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { answer, to: from });
});

socket.on("answer", async ({ answer }) => {
  console.log("Answer received");
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

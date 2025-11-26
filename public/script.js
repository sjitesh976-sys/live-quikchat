const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const statusText = document.querySelector(".status");

let localStream;
let peer;

startBtn.onclick = async () => {
  startBtn.disabled = true;
  statusText.textContent = "Searching for a partner...";

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };

  socket.emit("find");
};

socket.on("found", async () => {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.emit("offer", offer);
});

socket.on("offer", async (offer) => {
  await peer.setRemoteDescription(offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
  await peer.setRemoteDescription(answer);
  statusText.textContent = "Connected 🎉";
});

socket.on("candidate", (candidate) => {
  peer.addIceCandidate(new RTCIceCandidate(candidate));
});

stopBtn.onclick = () => {
  window.location.reload();
};

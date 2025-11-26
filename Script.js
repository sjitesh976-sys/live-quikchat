const socket = io();
let localStream;
let peerConnection;
let partnerId = null;

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const muteBtn = document.getElementById("muteBtn");
const matching = document.getElementById("matching");

startBtn.onclick = async () => {
  matching.style.display = "flex";

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  createPeerConnection();

  socket.emit("find-partner");
};

nextBtn.onclick = () => {
  socket.emit("next");
  matching.style.display = "flex";
};

muteBtn.onclick = () => {
  const enabled = localStream.getAudioTracks()[0].enabled;
  localStream.getAudioTracks()[0].enabled = !enabled;
  muteBtn.innerHTML = enabled 
    ? '<i class="fa-solid fa-microphone"></i>' 
    : '<i class="fa-solid fa-microphone-slash"></i>';
};

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track =>
    peerConnection.addTrack(track, localStream)
  );

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    matching.style.display = "none";
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && partnerId) {
      socket.emit("signal", {
        partnerId,
        signal: { candidate: event.candidate }
      });
    }
  };
}

socket.on("partner", async (id) => {
  partnerId = id;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("signal", {
    partnerId,
    signal: { description: peerConnection.localDescription }
  });
});

socket.on("signal", async (data) => {
  if (data.signal.description) {
    await peerConnection.setRemoteDescription(data.signal.description);
    if (data.signal.description.type === "offer") {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("signal", {
        partnerId: data.from,
        signal: { description: peerConnection.localDescription }
      });
    }
  }

  if (data.signal.candidate) {
    await peerConnection.addIceCandidate(data.signal.candidate);
  }
});

socket.on("end", () => {
  remoteVideo.srcObject = null;
  matching.style.display = "flex";

  peerConnection.close();
  createPeerConnection();
});

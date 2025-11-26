// SOCKET CONNECTION
const socket = io("https://live-quikchat-2025-quikchat-random.onrender.com", {
  transports: ["websocket", "polling"]
});

// VIDEO ELEMENTS
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const matchingScreen = document.getElementById("matching");

// WEBRTC VARIABLES
let localStream;
let peerConnection;
let partnerId = null;

const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// SHOW / HIDE MATCHING SCREEN
function showMatching() {
  matchingScreen.style.display = "flex";
}
function hideMatching() {
  matchingScreen.style.display = "none";
}

// START CAMERA
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  localVideo.srcObject = localStream;
}
startCamera();

// START CHAT FUNCTION
async function startChat() {
  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("signal", {
        signal: event.candidate,
        partnerId
      });
    }
  };
}

// WHEN PARTNER FOUND
socket.on("partner", async (id) => {
  partnerId = id;
  await startChat();

  hideMatching();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("signal", {
    signal: offer,
    partnerId
  });
});

// SIGNAL HANDLING
socket.on("signal", async (data) => {
  if (data.signal.type === "offer") {
    await startChat();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("signal", {
      signal: answer,
      partnerId
    });

  } else if (data.signal.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));

  } else if (data.signal.candidate) {
    try {
      await peerConnection.addIceCandidate(data.signal);
    } catch (e) {
      console.error("ICE Error", e);
    }
  }
});

// ONLINE COUNT
socket.on("online-count", (count) => {
  document.getElementById("online").innerText = count;
});

// PARTNER DISCONNECTED
socket.on("end", () => {
  if (peerConnection) peerConnection.close();
  remoteVideo.srcObject = null;
  showMatching();
});

// BUTTON ACTIONS
document.getElementById("startBtn").onclick = () => {
  showMatching();
  socket.emit("next");
};

document.getElementById("nextBtn").onclick = () => {
  showMatching();
  if (peerConnection) peerConnection.close();
  remoteVideo.srcObject = null;
  socket.emit("next");
};

document.getElementById("muteBtn").onclick = () => {
  const audio = localStream.getAudioTracks()[0];
  audio.enabled = !audio.enabled;
};

document.getElementById("stopVideoBtn").onclick = () => {
  const video = localStream.getVideoTracks()[0];
  video.enabled = !video.enabled;
};

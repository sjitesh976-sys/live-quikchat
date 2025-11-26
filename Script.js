// Connect to socket server (Render hosted)
const socket = io("https://live-quikchatz.onrender.com");

// HTML elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("nextBtn");
const statusText = document.getElementById("status");

let localStream;
let peerConnection;
let currentTarget = null;

const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
    ]
};

// Start video stream
async function startVideo() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
}

startVideo();

// Request random match
function findPartner() {
    statusText.textContent = "Searching for partner...";
    socket.emit("find");
}

// Create peer connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(iceServers);

    localStream.getTracks().forEach(track =>
        peerConnection.addTrack(track, localStream)
    );

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("ice", { candidate: event.candidate, to: currentTarget });
        }
    };
}

// On match
socket.on("match", async (partnerId) => {
    currentTarget = partnerId;
    statusText.textContent = "Partner found! Connecting...";

    createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", { sdp: offer, target: partnerId });
});

// Receive offer
socket.on("offer", async ({ sdp, from }) => {
    currentTarget = from;
    createPeerConnection();

    await peerConnection.setRemoteDescription(sdp);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", { sdp: answer, target: from });
});

// Receive answer
socket.on("answer", async ({ sdp }) => {
    await peerConnection.setRemoteDescription(sdp);
});

// Receive ICE
socket.on("ice", async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (err) {
        console.error("ICE error:", err);
    }
});

// NEXT button → reload & find new
nextBtn.addEventListener("click", () => {
    location.reload();
});

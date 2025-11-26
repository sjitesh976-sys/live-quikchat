
// Connect to socket server (Render hosting)
const socket = io("https://live-quikchat.onrender.com");

// HTML elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("nextBtn");
const statusText = document.getElementById("statusText");

let localStream;
let peerConnection;
let currentTarget = null;

// ICE Servers
const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
    ]
};

// Start video
async function startVideo() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
}
startVideo();

// Find random partner
function findPartner() {
    statusText.textContent = "Searching for partner...";
    socket.emit("find-partner");  // FIXED
}

// Create Peer Connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(iceServers);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("ice", { candidate: event.candidate, target: currentTarget });
        }
    };
}

// Receive partner found
socket.on("partner-found", async partnerId => {
    currentTarget = partnerId;
    statusText.textContent = "Partner found! Connecting...";

    createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", { offer, target: partnerId });
});

// Receive offer
socket.on("offer", async data => {
    currentTarget = data.sender;
    createPeerConnection();

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", { answer, target: data.sender });
});

// Receive answer
socket.on("answer", async data => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// ICE candidates
socket.on("ice", async data => {
    try {
        await peerConnection.addIceCandidate(data.candidate);
    } catch (err) {
        console.error(err);
    }
});

// Waiting
socket.on("waiting", () => {
    statusText.textContent = "Waiting for partner...";
});

// Next button
nextBtn.addEventListener("click", () => {
    socket.emit("next");
    statusText.textContent = "Searching new partner...";
});

// Partner disconnected
socket.on("partner-disconnected", () => {
    statusText.textContent = "Partner left. Searching again...";
    remoteVideo.srcObject = null;

    if (peerConnection) peerConnection.close();
    socket.emit("find-partner");
});

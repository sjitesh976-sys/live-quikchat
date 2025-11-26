const socket = io(); 

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startCamera");
const callBtn = document.getElementById("callSupport");

let localStream;
let peerConnection;

const servers = {
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
};

// Start Camera
startBtn.addEventListener("click", async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        localVideo.play();
        console.log("Camera Started");
    } catch (error) {
        console.error("Camera Error:", error);
    }
});

// Call Support Button
callBtn.addEventListener("click", () => {
    createOffer();
});

async function createOffer() {
    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) socket.emit("ice-candidate", event.candidate);
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", offer);
}

// Receive Offer
socket.on("offer", async (offer) => {
    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) socket.emit("ice-candidate", event.candidate);
    };

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", answer);
});

// Receive Answer
socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});

// ICE Exchange
socket.on("ice-candidate", async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (e) {
        console.error(e);
    }
});

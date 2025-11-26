const socket = io();
let localStream;
let remoteStream;
let peerConnection;

const config = {
    iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] }
    ],
};

async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        const localVideo = document.getElementById("localVideo");
        localVideo.srcObject = localStream;
        localVideo.muted = true;
        await localVideo.play();

        console.log("Camera started successfully");
    } catch (err) {
        console.error("Camera Error:", err);
        alert("Please allow Camera & Microphone permission.");
    }
}

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    remoteStream = new MediaStream();
    document.getElementById("remoteVideo").srcObject = remoteStream;

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
        console.log("Remote video started");
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
        }
    };
}

document.getElementById("findBtn").addEventListener("click", async () => {
    console.log("Searching for partner...");
    socket.emit("find");
});

socket.on("partnerFound", async () => {
    console.log("Partner found!");
    await createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", offer);
});

socket.on("offer", async (offer) => {
    console.log("Offer received");
    await createPeerConnection();

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
    console.log("Answer received");
    await peerConnection.setRemoteDescription(answer);
});

socket.on("ice-candidate", async (candidate) => {
    console.log("ICE Candidate received");
    await peerConnection.addIceCandidate(candidate);
});

startCamera();

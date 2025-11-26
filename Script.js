// script.js
const socket = io(); // same-origin
let localStream = null;
let pc = null;
let partnerId = null;

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
    // Add TURN here if needed
  ]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const muteBtn = document.getElementById("muteBtn");
const endBtn = document.getElementById("endBtn");
const matching = document.getElementById("matching");
const onlineCounter = document.getElementById("online");
const muteIcon = document.getElementById("muteIcon");

function log(...args){ console.log("[QuikChat]", ...args); }

socket.on("online-count", (n) => {
  if (onlineCounter) onlineCounter.innerText = `Online: ${n}`;
});

function showMatching(show = true){
  if(!matching) return;
  if(show) matching.classList.remove("hidden");
  else matching.classList.add("hidden");
}

function createPeerConnection(){
  pc = new RTCPeerConnection(servers);

  pc.onicecandidate = (e) => {
    if(e.candidate && partnerId){
      socket.emit("signal", { partnerId, signal: { candidate: e.candidate } });
      log("sent candidate");
    }
  };

  pc.ontrack = (e) => {
    log("ontrack", e.streams);
    if(e.streams && e.streams[0]) {
      remoteVideo.srcObject = e.streams[0];
      showMatching(false);
    }
  };

  pc.onconnectionstatechange = () => {
    if(!pc) return;
    log("pc state:", pc.connectionState);
    if(pc.connectionState === "disconnected" || pc.connectionState === "failed"){
      remoteVideo.srcObject = null;
      showMatching(true);
    }
  };

  if(localStream){
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }
}

async function startFlow(){
  try{
    showMatching(true);
    log("Requesting local media...");
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    localVideo.srcObject = localStream;
    log("Local stream ready");
  }catch(err){
    console.error("getUserMedia error", err);
    alert("Allow camera & microphone and reload.");
    showMatching(false);
    return;
  }

  createPeerConnection();
  socket.emit("find-partner");
  log("find-partner emitted");
}

function sendNext(){
  socket.emit("next");
  if(pc){ try{ pc.close(); }catch(e){} pc = null; }
  remoteVideo.srcObject = null;
  showMatching(true);
  if(localStream) createPeerConnection();
}

function toggleMute(){
  if(!localStream) return;
  const tr = localStream.getAudioTracks()[0];
  if(!tr) return;
  tr.enabled = !tr.enabled;
  muteIcon.className = tr.enabled ? "fa-solid fa-microphone" : "fa-solid fa-microphone-slash";
}

function endCall(){
  if(pc){ try{ pc.close(); }catch(e){} pc = null; }
  if(localStream){ localStream.getTracks().forEach(t=>t.stop()); localStream = null; }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  showMatching(false);
  socket.emit("next");
}

// socket listeners
socket.on("connect", () => { log("socket connected:", socket.id); });

socket.on("partner", async (id) => {
  log("partner:", id);
  partnerId = id;
  if(!pc) createPeerConnection();

  try{
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { partnerId, signal: { description: pc.localDescription } });
    log("sent offer");
  }catch(err){
    console.error("offer error", err);
  }
});

socket.on("signal", async (data) => {
  if(!data || !data.signal) return;
  log("signal from", data.from, data.signal);
  partnerId = data.from;

  if(data.signal.description){
    const desc = data.signal.description;
    try{
      await pc.setRemoteDescription(desc);
      log("set remote desc", desc.type);
      if(desc.type === "offer"){
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { partnerId: data.from, signal: { description: pc.localDescription } });
        log("sent answer");
      }
    }catch(err){
      console.error("remote desc error", err);
    }
  }

  if(data.signal.candidate){
    try{
      await pc.addIceCandidate(data.signal.candidate);
      log("added candidate");
    }catch(err){
      console.error("addIceCandidate error", err);
    }
  }
});

socket.on("end", () => {
  log("partner ended");
  if(pc){ try{ pc.close(); }catch(e){} pc = null; }
  remoteVideo.srcObject = null;
  showMatching(true);
});

// attach UI handlers
startBtn.addEventListener("click", startFlow);
nextBtn.addEventListener("click", sendNext);
muteBtn.addEventListener("click", toggleMute);
endBtn.addEventListener("click", endCall);

// request initial online-count on connect
socket.on("connect", () => socket.emit("request-online-count"));

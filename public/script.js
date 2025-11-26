const startBtn = document.getElementById("startBtn");
const localVideo = document.getElementById("localVideo");

let localStream;

startBtn.addEventListener("click", async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error("Camera Error:", error);
    alert("Camera blocked or not available: " + error.message);
  }
});

const connectBtn = document.getElementById("connectBtn");

connectBtn.addEventListener("click", () => {
    console.log("Searching for next user...");
    // Yaha pe hum matching logic add karenge
});async function startChat() {
    document.getElementById("videos").style.display = "block";

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    document.getElementById("myVideo").srcObject = stream;

    alert("Random partner match system coming soon!");
}
const nextBtn = document.getElementById("connectBtn");

nextBtn.addEventListener("click", () => {
  ws.close(); 
  location.reload();
});

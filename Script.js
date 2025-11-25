async function startChat() {
    document.getElementById("videos").style.display = "block";

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    document.getElementById("myVideo").srcObject = stream;

    alert("Random partner match system coming soon!");
}

const SERVER = "https://stealth-voice-system.onrender.com";
const socket = io(SERVER);

let peer;

// 🎯 Generate Token
async function generateToken() {
    const res = await fetch(`${SERVER}/generate-token`);
    const data = await res.json();
    document.getElementById("token").innerText = data.token;
}

// 🔗 Generate Link
async function generateLink() {
    const res = await fetch(`${SERVER}/generate-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    document.getElementById("link").innerText = data.link;
}

// ✅ Verify Token
async function verifyToken() {
    const token = document.getElementById("inputToken").value;

    const res = await fetch(`${SERVER}/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
    });

    const data = await res.json();

    if (data.success) {
        startCall();
    } else {
        alert("Invalid / Expired Token ❌");
    }
}

// 🔍 Auto-read token from URL
window.onload = () => {
    const parts = window.location.pathname.split("/");
    if (parts[1] === "join") {
        document.getElementById("inputToken").value = parts[2];
    }
};

// 📡 WebRTC Call
async function startCall() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    peer = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
        ]
    });

    // Add local tracks
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    // Receive remote audio
    peer.ontrack = event => {
        const audio = document.createElement("audio");
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
    };

    // ICE candidates
    peer.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
        }
    };

    socket.on("ice-candidate", candidate => {
        if (peer) {
            peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    // Handle offer
    socket.on("offer", async offer => {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("answer", answer);
    });

    // Handle answer
    socket.on("answer", async answer => {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Create offer ONLY for caller
    if (!window.location.pathname.includes("/join")) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", offer);
    }

    alert("Call Started 🔐");
}
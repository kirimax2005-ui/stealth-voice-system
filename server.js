const express = require("express");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

console.log("🔥 CORRECT SERVER.JS IS RUNNING");

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Token storage
let tokens = {};

// ✅ Root
app.get("/", (req, res) => {
    res.send("FINAL SERVER WORKING ✅");
});

// 🔐 Generate Token
app.get("/generate-token", (req, res) => {
    const token = Math.random().toString(36).substring(2, 10);
    res.json({ token });
});

// 🔗 Generate Link
app.post("/generate-link", (req, res) => {
    const token = crypto.randomBytes(4).toString("hex");

    tokens[token] = {
        used: false,
        expiry: Date.now() + 120000
    };

    const baseUrl =
        process.env.FRONTEND_URL || "https://silent-voice-system.netlify.app";

    res.json({
        link: `${baseUrl}/join/${token}`,
        token: token
    });
});

// ✅ Verify Token
app.post("/verify-token", (req, res) => {
    const { token } = req.body;

    if (!tokens[token]) {
        return res.json({ success: false, message: "Invalid Token" });
    }

    if (tokens[token].used) {
        return res.json({ success: false, message: "Already Used" });
    }

    if (Date.now() > tokens[token].expiry) {
        return res.json({ success: false, message: "Expired" });
    }

    tokens[token].used = true;

    res.json({ success: true });
});

// 📡 WebRTC Signaling with ROOMS (IMPORTANT FIX)
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join room using token
    socket.on("join-room", (token) => {
        socket.join(token);
        console.log(`User ${socket.id} joined room ${token}`);
    });

    socket.on("offer", ({ token, offer }) => {
        socket.to(token).emit("offer", offer);
    });

    socket.on("answer", ({ token, answer }) => {
        socket.to(token).emit("answer", answer);
    });

    socket.on("ice-candidate", ({ token, candidate }) => {
        socket.to(token).emit("ice-candidate", candidate);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// 🚀 Start server
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Root route (fix "Cannot GET /")
app.get("/", (req, res) => {
    res.send("✅ Indie Call Backend Running");
});

// ✅ Health route
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let rooms = {};
let tokens = {};

// 🔐 Generate link (UPDATED URL)
app.post("/generate-link", (req, res) => {
    const token = crypto.randomBytes(4).toString("hex");

    tokens[token] = {
        expiry: Date.now() + 15 * 60 * 1000
    };

    const baseUrl = "https://stealth-voice-system.pages.dev";

    res.json({
        token,
        link: `${baseUrl}/join/${token}`
    });
});

// ✅ Verify token
app.post("/verify-token", (req, res) => {
    const { token } = req.body;

    if (!tokens[token]) return res.json({ success: false });

    if (Date.now() > tokens[token].expiry) {
        delete tokens[token];
        return res.json({ success: false });
    }

    res.json({ success: true });
});

// 📡 WebRTC signaling
io.on("connection", (socket) => {

    socket.on("join", (token) => {
        socket.join(token);

        if (!rooms[token]) rooms[token] = [];
        rooms[token].push(socket.id);

        if (rooms[token].length === 2) {
            io.to(rooms[token][0]).emit("ready", true);
            io.to(rooms[token][1]).emit("ready", false);
        }
    });

    socket.on("offer", ({ token, offer }) => {
        socket.to(token).emit("offer", offer);
    });

    socket.on("answer", ({ token, answer }) => {
        socket.to(token).emit("answer", answer);
    });

    socket.on("ice", ({ token, candidate }) => {
        socket.to(token).emit("ice", candidate);
    });

    socket.on("disconnect", () => {
        for (let t in rooms) {
            rooms[t] = rooms[t].filter(id => id !== socket.id);
            if (rooms[t].length === 0) delete rooms[t];
        }
    });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});
// FIRST import, and it must stay first. ES module imports are hoisted and
// evaluated before any statement in this file, so a `dotenv.config()` call
// further down runs *after* every module below has already been initialised —
// which left AIService.js building its Gemini client with no API key.
import 'dotenv/config';

import express from 'express';
import http from "http";

import compression from 'compression';
import cors from 'cors';
import connectDB from './config/database.js';
import { Server } from "socket.io";

import userRoutes from './routes/userRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import todoRoutes from './routes/todoRoutes.js';
import postRoutes from './routes/forumRoutes/postRoutes.js';
import commentRoutes from './routes/forumRoutes/commentRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import setupSocket from "./socket/chatSocket.js";
import UserStatus from './models/chatModels/userStatusModel.js';
import AIRoute from './routes/AIchatRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

// import groupTaskRoutes from './routes/groupTaskRoutes.js';
// import taskRoutes from './routes/taskRoutes.js';

await connectDB(); // MongoDB connection — must succeed before we accept traffic


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: {
    path: "/socket.io",
    origin: "*", // Or restrict to your frontend origin
    methods: ["GET", "POST"]
  }});

// gzip every response big enough to be worth it. These payloads are JSON —
// long lists of notes, posts and messages — which compresses to a fraction of
// its size, so this is the cheapest bandwidth win available. Must be mounted
// before the routes to wrap their responses.
app.use(compression());

app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Routes
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chat', messageRouter);
app.use('/api/ai', AIRoute);
app.use('/api/dashboard',dashboardRoutes)

// app.use('/api/tasks', taskRoutes);
// app.use('/api/group-tasks', groupTaskRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Nobody is connected to a process that has just started. Without this, anyone
// whose socket died with the previous process stays "online" forever.
await UserStatus.updateMany({ isOnline: true }, { isOnline: false });

setupSocket(io);


// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

server.listen(PORT, () => {
  console.log(`✅ Server + Socket.IO running on port ${PORT}`);
});
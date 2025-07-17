import express from 'express';
import http from "http";

import cors from 'cors';
import dotenv from 'dotenv';
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

// import groupTaskRoutes from './routes/groupTaskRoutes.js';
// import taskRoutes from './routes/taskRoutes.js';

dotenv.config();
connectDB(); // MongoDB connection


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: {
    path: "/socket.io",
    origin: "*", // Or restrict to your frontend origin
    methods: ["GET", "POST"]
  }});

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

// app.use('/api/tasks', taskRoutes);
// app.use('/api/group-tasks', groupTaskRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

setupSocket(io);


// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

server.listen(PORT, () => {
  console.log(`✅ Server + Socket.IO running on port ${PORT}`);
});
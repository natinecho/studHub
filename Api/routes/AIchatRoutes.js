import express from "express";

import { AIChat,getSummarizedNote } from "../controllers/AIchatController.js";
import { verifyToken } from "../Midleware/authMiddleware.js";

const AIRoute = express.Router()

AIRoute.post('/chat',verifyToken,AIChat);
AIRoute.post('/summarize/:id',verifyToken,getSummarizedNote);

export default AIRoute;
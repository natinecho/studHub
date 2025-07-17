import express from "express";
import { getMessagesForConversation, getMessagesForGroup,getAllConversations } from "../controllers/messageController.js";
import { verifyToken } from '../Midleware/authMiddleware.js';

const messageRouter = express.Router();
messageRouter.get("/conversation/:id", verifyToken, getMessagesForConversation);
messageRouter.get("/conversation", verifyToken, getAllConversations);
messageRouter.get("/group/:id", verifyToken, getMessagesForGroup);
// messageRouter.post("/seen", verifyToken, getSeen);
export default messageRouter;

import express from 'express';

import { createComment,deleteComment,getCommentsByPost,updateComment,voteComment } from '../../controllers/forumControllers/commentControllers.js';
import {optionalAuth, verifyToken } from '../../Midleware/authMiddleware.js';

const commentRoutes = express.Router();

commentRoutes.post('/', verifyToken,createComment);
// Optional auth: the thread is public, but a signed-in reader also gets back
// which way they voted on each reply.
commentRoutes.get('/:postId', optionalAuth, getCommentsByPost);
commentRoutes.put('/:id', verifyToken, updateComment);
commentRoutes.delete('/:id', verifyToken, deleteComment);

commentRoutes.post('/:id/vote', verifyToken, voteComment);

export default commentRoutes;

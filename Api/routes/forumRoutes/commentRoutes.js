import express from 'express';

import { createComment,deleteComment,getCommentById,getComments,updateComment,upvoteComment } from '../../controllers/forumControllers/commentControllers.js';

import {verifyToken } from '../../Midleware/authMiddleware.js';

const commentRoutes = express.Router();

commentRoutes.post('/', verifyToken,createComment);
commentRoutes.get('/', getComments);
commentRoutes.get('/:id', getCommentById);
commentRoutes.put('/:id', verifyToken, updateComment);
commentRoutes.delete('/:id', verifyToken, deleteComment);

commentRoutes.post('/:id/upvote', verifyToken, upvoteComment);

export default commentRoutes;
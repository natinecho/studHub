import express from 'express';

import { createComment,deleteComment,getCommentsByPost,updateComment,upvoteComment } from '../../controllers/forumControllers/commentControllers.js';
import {verifyToken } from '../../Midleware/authMiddleware.js';

const commentRoutes = express.Router();

commentRoutes.post('/', verifyToken,createComment);
commentRoutes.get('/:postId', getCommentsByPost);
commentRoutes.put('/:id', verifyToken, updateComment);
commentRoutes.delete('/:id', verifyToken, deleteComment);

commentRoutes.post('/:id/vote', verifyToken, upvoteComment);

export default commentRoutes;
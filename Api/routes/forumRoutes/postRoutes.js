import express from 'express';

import { createPost,deletePost,getPostById,getPosts,updatePost, likePost} from '../../controllers/forumControllers/postControllers.js';

import { optionalAuth,verifyToken } from '../../Midleware/authMiddleware.js';

const postRoutes = express.Router();

postRoutes.post('/', verifyToken,createPost);
postRoutes.get('/', optionalAuth, getPosts);
postRoutes.get('/:id', optionalAuth, getPostById);
postRoutes.put('/:id', verifyToken, updatePost);
postRoutes.delete('/:id', verifyToken, deletePost);

// like a post
postRoutes.post('/:id/like', verifyToken, likePost);

export default postRoutes;
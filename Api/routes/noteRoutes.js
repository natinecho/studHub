import express from 'express';

import { createNote,getNoteById,getNotes,updateNote,deleteNote} from '../controllers/noteController.js';

import { verifyToken } from '../Midleware/authMiddleware.js';

const noteRoutes = express.Router();

noteRoutes.post('/', verifyToken,createNote);
noteRoutes.get('/', verifyToken, getNotes);
noteRoutes.get('/:id', verifyToken, getNoteById);
noteRoutes.put('/:id', verifyToken, updateNote);
noteRoutes.delete('/:id', verifyToken, deleteNote);

export default noteRoutes;
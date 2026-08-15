import express from 'express';
import { verifyToken ,optionalAuth} from '../Midleware/authMiddleware.js';
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  generateShareLink,
  revokeShareLink,
  getNoteByShareLink,
  exportNotePDF
} from '../controllers/noteController.js';

const noteRoutes = express.Router();

// CRUD
noteRoutes.post('/', verifyToken, createNote);
noteRoutes.get('/', verifyToken, getNotes);
noteRoutes.get('/:id', verifyToken, getNoteById);
noteRoutes.patch('/:id', verifyToken, updateNote); // use PATCH for partial updates / auto-save
noteRoutes.delete('/:id', verifyToken, deleteNote);

// Shareable link
noteRoutes.post('/:id/share', verifyToken, generateShareLink);
noteRoutes.delete('/:id/share', verifyToken, revokeShareLink); // stop sharing
noteRoutes.get('/share/:shareLink',optionalAuth, getNoteByShareLink); // public access via share link

// Export PDF
noteRoutes.get('/:id/export', verifyToken, exportNotePDF);

export default noteRoutes;

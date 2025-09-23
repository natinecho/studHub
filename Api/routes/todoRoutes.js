import express from 'express';

import { createToDo,getToDoById,getToDos,updateToDo,deleteToDo,toggleCompletion } from '../controllers/todoController.js';

import { verifyToken } from '../Midleware/authMiddleware.js';

const todoRoutes = express.Router();

todoRoutes.post('/', verifyToken,createToDo);
todoRoutes.get('/', verifyToken, getToDos);
todoRoutes.get('/:id', verifyToken, getToDoById);
todoRoutes.put('/:id', verifyToken, updateToDo);
todoRoutes.patch('/:id/completed', verifyToken, toggleCompletion);
todoRoutes.delete('/:id', verifyToken, deleteToDo);

export default todoRoutes;
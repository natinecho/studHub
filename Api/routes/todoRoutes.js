import express from 'express';

import { createToDo,getToDoById,getToDos,updateToDo,deleteToDo } from '../controllers/todoController.js';

import { verifyToken } from '../Midleware/authMiddleware.js';

const todoRoutes = express.Router();

todoRoutes.post('/', verifyToken,createToDo);
todoRoutes.get('/', verifyToken, getToDos);
todoRoutes.get('/:id', verifyToken, getToDoById);
todoRoutes.put('/:id', verifyToken, updateToDo);
todoRoutes.delete('/:id', verifyToken, deleteToDo);

export default todoRoutes;
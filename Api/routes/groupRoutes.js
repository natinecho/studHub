import express from "express";

import {
  createGroup,
  getGroup,
  getGroupByID,
  updateGroup,
  deleteGroup,
  acceptInvite,
  declineInvite,
  getMyInvite,
  leaveGroup,
  demoteAdmin,
  promoteToAdmin,
  addMember,
  removeMember,
} from "../controllers/groupController.js";

import { verifyToken } from "../Midleware/authMiddleware.js";

const groupRoutes = express.Router();

// Groups
groupRoutes.post('/', verifyToken, createGroup);
groupRoutes.get('/', verifyToken, getGroup);
groupRoutes.get('/:id', verifyToken, getGroupByID);
groupRoutes.put('/:id', verifyToken, updateGroup);
groupRoutes.delete('/:id', verifyToken, deleteGroup);

// Members
groupRoutes.post('/:id/members', verifyToken, addMember);
groupRoutes.delete('/:id/members/:userId', verifyToken, removeMember);

// Admin roles
groupRoutes.post('/:id/promote/:userId', verifyToken, promoteToAdmin);
groupRoutes.post('/:id/demote/:userId', verifyToken, demoteAdmin);
groupRoutes.post('/:id/leave', verifyToken, leaveGroup);

// Invites
groupRoutes.get('/me/invites', verifyToken, getMyInvite);
groupRoutes.post('/invites/:inviteId/accept', verifyToken, acceptInvite);
groupRoutes.post('/invites/:inviteId/decline', verifyToken, declineInvite);

export default groupRoutes;
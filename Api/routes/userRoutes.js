import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  favoritePosts,
  updateProfile,
} from "../controllers/userController.js";
import {
  resetPassword,
  forgetPassword,
  changePassword,
} from "../controllers/passwordController.js";
import { verifyToken } from "../Midleware/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.post("/register", registerUser);
userRoutes.post("/login", loginUser);
userRoutes.get("/me", verifyToken, getUserProfile);
userRoutes.put("/me", verifyToken, updateProfile);

//add or remove favourite post
userRoutes.post("/fav/:id", verifyToken, favoritePosts);

//password manager
userRoutes.put("/change-password", verifyToken, changePassword);
userRoutes.post("/forget-password", forgetPassword);
userRoutes.put("/reset-password", resetPassword);

export default userRoutes;

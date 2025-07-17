import express from "express";
import {registerUser,loginUser,getUserProfile,favoritePosts,} from "../controllers/userController.js";
import { verifyToken } from "../Midleware/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.post("/register", registerUser);
userRoutes.post("/login", loginUser);
userRoutes.get("/:id", verifyToken, getUserProfile);

//add or remove favourite post
userRoutes.post("/fav/:id", verifyToken, favoritePosts);


export default userRoutes;

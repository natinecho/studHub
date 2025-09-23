import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Post from "../models/forumModels/postModel.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// POST /api/users/register
export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  const userExist = await User.findOne({ email });

  if (userExist) {
    return res.status(400).send({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 15);

  const user = await User.create({ username, email, password: hashedPassword });

  res.status(201).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user._id),
  });
};

// POST /api/users/login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) return res.status(400).send({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);

  if (!match) return res.status(400).send({ message: "Invalid credentials" });

  res.status(200).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user._id),
  });
};

//  GET /api/users/:id
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).send({ message: "User not found" });

  res.status(200).json({
    _id: user._id,
    username: user.username,
    email: user.email,
  });
};



export const updateProfile = async (req,res) => {

  try{

    const { username, bio, profile_pic, whoCanAddMeToGroup} = req.body; 
    
    // username has to be unique
    if(username){
      const existingUser = await User.findOne({username})
      
      if(existingUser && existingUser._id.toString() !== req.user._id.toString()){
        return res.status(400).json({message:"Username is already taken"})
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id,{
      ...(username && {username}),
      ...(bio && {bio}),
      ...(profile_pic && {profile_pic}),
      ...(whoCanAddMeToGroup != undefined && {profile_pic}),
    },
    { new: true, runValidators: true }
    ).select("-password");
    
    if (!updatedUser) return res.status(404).json({ message: "user not found" });

    return res.status(200).json({message: "Profile updated successfully",
      user: updatedUser})

  }catch (error){
      res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
}

export const forgotPassword = async (req,res) => {
   
}
export const favoritePosts = async (req,res) => {
  try {
  
      const post = await Post.findById({_id:req.params.id});

      if (!post) return res.status(404).send({ message: "Post not found" });

      const user = await User.findById({_id:req.user._id});

      const isFav = user.favourites.includes(req.params.id)

      if(isFav){
        user.favourites.pull(req.params.id)
      }
      else{
        user.favourites.push(req.params.id)
      }

      await user.save(); // <-- make sure to `await` this

      return res.status(200).json({
        message: isFav ?  "Removed from favorites" : "Added to favorites",
        isFavourites: !isFav
      });
      
    } catch (error) {
      res.status(500).json({ message: "Failed to add Post to favourites", error });
    }
}
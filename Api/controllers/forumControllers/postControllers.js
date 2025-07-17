import Post from "../../models/forumModels/postModel.js";
import User from "../../models/userModel.js";

export const createPost = async (req, res) => {
  try {

    const { title, content, tags = [] } = req.body;

    const post = await Post.create({
      user: req.user._id,
      title,
      content,
      tags,
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: "Failed to create Post", error });
  }
};

export const getPosts = async (req, res) => {
    try {
      const posts = await Post.find().populate("user", "username").sort({ createdAt: -1 });
      if (req.user) {
        const user = await User.findById(req.user._id).select("favourites");
        const favSet = new Set(user.favourites.map(id => id.toString()));
  
        const postsWithFav = posts.map(post => ({
          ...post.toObject(),
          isFavourite: favSet.has(post._id.toString()),
          isLiked: post.likes.includes(req.user._id),
          likeCount: post.likes.length,
        }));
  
        return res.status(200).json(postsWithFav);
      }

      res.status(200).json(posts)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Post", error });
    }
  };

  export const getPostById = async (req, res) => {
    try {
      const post = await Post.findById(req.params.id).populate("user", "username");

      if (!post) return res.status(404).send({ message: "Post not found" });

      if (req.user) {
        const user = await User.findById(req.user._id).select("favourites");
        const favSet = new Set(user.favourites.map(id => id.toString()));
  
        const postsWithFav = {
          ...post.toObject(),
          isFavourite: favSet.has(post._id.toString()),
          isLiked: post.likes.includes(req.user._id),
          likeCount: post.likes.length,
        };
  
        return res.status(200).json(postsWithFav);
      }

      res.status(200).json(post)
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Post", error });
    }
  };

  export const updatePost = async (req, res) => {
    try {
    
      const updates = req.body
      const post = await Post.findByIdAndUpdate({_id:req.params.id,user:req.user._id},updates, {
        new: true,
        runValidators: true, 
      });

      if (!post) return res.status(404).send({ message: "Post not found" });

      res.status(200).json(post)
      
    } catch (error) {
      res.status(500).json({ message: "Failed to update Post", error });
    }
  };
  
  export const deletePost = async (req, res) => {
    try {
    
      const post = await Post.findByIdAndDelete({_id:req.params.id,user:req.user._id});

      if (!post) return res.status(404).send({ message: "Post not found" });

      await Comment.deleteMany({ post: req.params.id });

      res.status(200).json({ message: 'Post and related comments deleted' })
      
    } catch (error) {
      res.status(500).json({ message: "Failed to delete Post", error });
    }
  };

  export const likePost = async (req,res) => {
    try {
    
        const post = await Post.findById({_id:req.params.id});

        if (!post) return res.status(404).send({ message: "Post not found" });

        const isLiked = post.likes.includes(req.user._id)

        if(isLiked){
            post.likes.pull(req.user._id)
        }
        else{
            post.likes.push(req.user._id)
        }
  
        await post.save(); // <-- make sure to `await` this

        return res.status(200).json({
          message: isLiked ? "Like removed" : "Like added",
          isLiked: !isLiked,
          likeCount: post.likes.length,
        });
        
      } catch (error) {
        res.status(500).json({ message: "Failed to like Post", error });
      }
  }


  
import Comment from "../../models/forumModels/commentModel.js";
import Post from "../../models/forumModels/postModel.js";

export const createComment = async (req, res) => {
  try {
    const { post, content, parentComment } = req.body;

    const findPost = await Post.findById(post);

    if (!findPost) return res.status(404).json({ message: "no such post" });

    if (parentComment) {
      const findComment = await Comment.findById(parentComment);
      if (!findComment)
        return res.status(404).json({ message: "no such comment" });
    }

    const comment = await Comment.create({
      user: req.user._id,
      post,
      content,
      parentComment,
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Failed to create comment", error });
  }
};

export const getCommentsByPost = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("user", "username -_id")
      .populate("parentComment", "content user") // include parent info
      .populate({
        path: "parentComment",
        populate: { path: "user", select: "username -_id" }, // populate parent user too
      })
      .sort({ createdAt: 1 });


    if (!comments || comments.length === 0)
      return res.status(404).send({ message: "Comment not found" });

    res.status(200).json({comments});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch comments", error });
  }
};

// optional
// export const getCommentById = async (req, res) => {
//   try {
//     const comment = await Comment.findById(req.params.id)
//       .populate("user", "username")
//       .populate("parentComment", "content user") // include parent info
//       .populate({
//         path: "parentComment",
//         populate: { path: "user", select: "username" }, // populate parent user too
//       });

//     if (!comment) return res.status(404).send({ message: "Comment not found" });

//     res.status(200).json(comment);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to Fetch Comment", error });
//   }
// };

export const updateComment = async (req, res) => {
  try {
    const {post,parentComment,content} = req.body;

   const comment = await Comment.findOneAndUpdate(
  { _id: req.params.id, user: req.user._id }, 
  { post, parentComment, content },
  { new: true, runValidators: true }
)
  .populate("user", "username -_id")
  .populate("parentComment", "content user")
  .populate({
    path: "parentComment",
    populate: { path: "user", select: "username -_id" },
  });
    
    

    if (!comment) return res.status(404).send({ message: "Comment not found" });

    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Failed to update Comment", error });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!comment) return res.status(404).send({ message: "Comment not found" });

    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete Comment", error });
  }
};

export const upvoteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const { vote } = req.body; // expected: -1 or 1
    const userId = req.user._id;

    if (![1, -1].includes(vote)) {
      return res.status(400).json({ message: "Invalid vote value" });
    }

    const existingVote = comment.votes.find(
      (v) => v.user.toString() === userId.toString()
    );

    if (existingVote) {
      // Remove effect of previous vote
      if (existingVote.value === 1) comment.upvotes--;
      if (existingVote.value === -1) comment.downvotes--;

      // Apply new vote
      existingVote.value = vote;
      if (vote === 1) comment.upvotes++;
      if (vote === -1) comment.downvotes++;
      
    } else {
      comment.votes.push({ user: userId, value: vote });
      if (vote === 1) comment.upvotes++;
      if (vote === -1) comment.downvotes++;
    }

    await comment.save();

    return res.status(200).json({
      message: "Vote updated",
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to upvote Comment", error });
  }
};


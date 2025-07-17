import Comment from "../../models/forumModels/commentModel.js";
import Post from "../../models/forumModels/postModel.js";

export const createComment = async (req, res) => {
  try {
    const { post, content } = req.body;

    const findPost = await Post.findById(post);

    if (!findPost) return res.status(404).json({ message: "no such post" });

    const comment = await Comment.create({
      user: req.user._id,
      post,
      content,
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Failed to create comment", error });
  }
};

export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate("user", "username")
      .sort({ score: -1 });

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Failed to Fetch comment", error });
  }
};

export const getCommentById = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate(
      "user",
      "username"
    );

    if (!comment) return res.status(404).send({ message: "Comment not found" });

    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Failed to Fetch Comment", error });
  }
};

export const updateComment = async (req, res) => {
  try {
    const updates = req.body;

    const comment = await Comment.findByIdAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!comment) return res.status(404).send({ message: "Comment not found" });

    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Failed to update Comment", error });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!comment) return res.status(404).send({ message: "Comment not found" });

    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete Comment", error });
  }
};

export const upvoteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).send({ message: "Comment not found" });

    const { vote } = req.body; // expected: -1, 0, or 1
    const userId = req.user._id

    if (![1, 0, -1].includes(vote)) {
      return res.status(400).json({ message: "Invalid vote value" });
    }

    const existingVote = comment.votes.find(v => v.user.toString() === userId.toString());
    let previous = 0;

    if (existingVote) {
      previous = existingVote.value;
      existingVote.value = vote; // update vote
    } else {
      comment.votes.push({ user: userId, value: vote });
    }

    // Update score: remove old vote, add new
    comment.score = comment.score - previous + vote;

    await comment.save();

    return res.status(200).json({ message: "Vote updated", score: comment.score });
  } catch (error) {
    res.status(500).json({ message: "Failed to upvote Comment", error });
  }
};

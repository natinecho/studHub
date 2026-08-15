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

    const created = await Comment.create({
      user: req.user._id,
      post,
      content,
      parentComment: parentComment || null,
    });

    // Populate the author before answering: the client renders the new reply
    // straight from this response, so an unpopulated `user` would show as blank.
    const comment = await Comment.findById(created._id)
      .populate("user", "username profile_pic")
      .lean();

    res.status(201).json({ ...comment, myVote: 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to create comment", error });
  }
};

export const getCommentsByPost = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("user", "username profile_pic")
      .sort({ createdAt: 1 })
      .lean();

    // The thread is nested client-side, so each row only needs its parent's id
    // — and the caller's own vote, so the up/down buttons can show as active.
    // `votes` itself never leaves the server: it is every user's ballot.
    const userId = req.user?._id?.toString();
    const shaped = (comments || []).map(({ votes, ...comment }) => ({
      ...comment,
      parentComment: comment.parentComment
        ? comment.parentComment.toString()
        : null,
      myVote:
        (userId &&
          votes?.find((v) => v.user?.toString() === userId)?.value) ||
        0,
    }));

    // An empty thread is a valid state, not a 404.
    res.status(200).json({ comments: shaped });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch comments", error });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "A reply cannot be empty" });
    }

    // Only the text is editable. `post` and `parentComment` are deliberately
    // ignored even if sent: letting an edit re-parent a reply would let anyone
    // move their comment under someone else's, or under one of its own
    // descendants, which would make the thread a cycle.
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { content: content.trim() },
      { new: true, runValidators: true }
    )
      .populate("user", "username profile_pic")
      .lean();

    if (!comment) return res.status(404).send({ message: "Comment not found" });

    const { votes, ...rest } = comment;
    const userId = req.user._id.toString();
    res.status(200).json({
      ...rest,
      parentComment: rest.parentComment ? rest.parentComment.toString() : null,
      myVote: votes?.find((v) => v.user?.toString() === userId)?.value ?? 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update Comment", error });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!comment) return res.status(404).send({ message: "Comment not found" });

    // Replies hang off their parent, so removing a parent must take its whole
    // subtree with it — otherwise the orphans vanish from the nested view but
    // keep inflating the reply count.
    const removeDescendants = async (parentIds) => {
      if (parentIds.length === 0) return 0;
      const children = await Comment.find({
        parentComment: { $in: parentIds },
      }).select("_id");
      if (children.length === 0) return 0;
      const childIds = children.map((child) => child._id);
      const deeper = await removeDescendants(childIds);
      await Comment.deleteMany({ _id: { $in: childIds } });
      return childIds.length + deeper;
    };

    const removedReplies = await removeDescendants([comment._id]);

    res.status(200).json({
      message: "Comment deleted",
      removedCount: removedReplies + 1,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete Comment", error });
  }
};

export const voteComment = async (req, res) => {
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

    let myVote = vote;

    if (existingVote) {
      // Undo whichever way they had voted before.
      if (existingVote.value === 1) comment.upvotes--;
      if (existingVote.value === -1) comment.downvotes--;

      if (existingVote.value === vote) {
        // Pressing the button you already chose clears the vote — the same
        // toggle behaviour people expect from a like.
        comment.votes.pull(existingVote._id);
        myVote = 0;
      } else {
        existingVote.value = vote;
        if (vote === 1) comment.upvotes++;
        if (vote === -1) comment.downvotes++;
      }
    } else {
      comment.votes.push({ user: userId, value: vote });
      if (vote === 1) comment.upvotes++;
      if (vote === -1) comment.downvotes++;
    }

    // A stale count from before this endpoint existed could go negative.
    comment.upvotes = Math.max(0, comment.upvotes);
    comment.downvotes = Math.max(0, comment.downvotes);

    await comment.save();

    return res.status(200).json({
      message: "Vote updated",
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      myVote,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to vote on comment", error });
  }
};

/** @deprecated Kept as an alias so older imports keep resolving. */
export const upvoteComment = voteComment;
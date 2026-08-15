import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    content: { type: String, required: true },
    votes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        value: { type: Number, enum: [-1,1] }, // -1 = downvote, 1 = upvote
      },
    ],
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 } 
  },
  { timestamps: true }
);

// Every comment read is "the comments on this post", either listed in order
// or counted; the post-list aggregate matches { post: { $in: [...] } }.
commentSchema.index({ post: 1, createdAt: 1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;

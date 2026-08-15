import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: {type: [String], default: [] },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User",default:[] }],
  },
  { timestamps: true }
);

// The forum lists newest-first, optionally narrowed to your own posts; the
// second index also serves the dashboard's weekly post counts.
// Note: the search filter uses $regex, which no ordinary index can serve — see
// the note in the review if search ever needs to scale.
postSchema.index({ createdAt: -1 });
postSchema.index({ user: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;

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

const Post = mongoose.model("Post", postSchema);

export default Post;

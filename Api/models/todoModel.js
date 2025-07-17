import mongoose from "mongoose";

const TodoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    discription: { type: String, default: "" }, // HTML string
    completed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const ToDo = mongoose.model("Todo", TodoSchema);
export default ToDo;

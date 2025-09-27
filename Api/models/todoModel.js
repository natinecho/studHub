import mongoose from "mongoose";

const TodoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // creator
    title: { type: String, required: true },
    discription: { type: String },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    type: { type: String, enum: ["personal", "group"], required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deadline: { type: Date },

    // per-user completion tracking
    completions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: Boolean, default: false },
      },
      { _id: false } 
    ],
  },
  { timestamps: true }
);

const Todo = mongoose.model("Todo", TodoSchema);
export default Todo;

import mongoose from "mongoose";

const TodoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true,},
    title: { type: String, required: true, trim: true,},
    description: { type: String, default: "",},
    completed: { type: Boolean, default: false,},
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium",},
    type: { type: String, enum: ["personal", "group"], default: "personal",},
    assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User",},],
    deadline: { type: Date, required: false,},
  },
  {
    timestamps: true,
  }
);

const Todo = mongoose.model("Todo", TodoSchema);
export default Todo;

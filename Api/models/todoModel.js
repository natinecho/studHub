import mongoose from "mongoose";

const TodoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // creator
    title: { type: String, required: true },
    discription: { type: String },
    category: { type: String, default: "Academic", trim: true },
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

// A task is visible if you created it OR it was assigned to you — again an
// $or, so both branches are indexed separately.
TodoSchema.index({ user: 1 });
TodoSchema.index({ assignedMembers: 1 });

// The dashboard counts completions, which live per-user inside the array.
// Both paths sit under the single `completions` array, so this stays a legal
// multikey compound index.
TodoSchema.index({ "completions.user": 1, "completions.status": 1, updatedAt: -1 });
TodoSchema.index({ type: 1, "completions.user": 1, "completions.status": 1 });

const Todo = mongoose.model("Todo", TodoSchema);
export default Todo;

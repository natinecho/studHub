import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
}, { timestamps: true });

// Membership is the filter behind almost every group query. The two sorts the
// app actually uses (chat list by updatedAt, dashboard week windows by
// createdAt) each get the timestamp as a suffix, so a plain { members: 1 } is
// unnecessary — it is a prefix of both.
GroupSchema.index({ members: 1, updatedAt: -1 });
GroupSchema.index({ members: 1, createdAt: -1 });

const Group = mongoose.model('Group', GroupSchema);
export default Group;
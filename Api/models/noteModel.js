import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: {  type: String,  default: 'Untitled' },
    content: {  type: String, required: true }, 
    type: { type: String, enum: ['personal', 'group'], default: 'personal',},
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: function () {
        return this.type === 'group';
      },
    },// required if it is group note

    tags: [{ type: String, trim: true }],
    shareLink: { 
      type: String, 
      unique: true, 
      sparse: true 
    }, // generated UUID or hash for public sharing

  },
  {
    timestamps: true, 
  }
);

// The notes list is `{ $or: [{ user }, { type: "group", group: { $in } }] }`
// sorted by updatedAt — Mongo runs each $or branch separately, so each branch
// needs its own index, and carrying updatedAt in both lets the sort come from
// the index instead of a full in-memory sort.
NoteSchema.index({ user: 1, updatedAt: -1 });
NoteSchema.index({ group: 1, type: 1, updatedAt: -1 });

// The dashboard's this-week / last-week note counts.
NoteSchema.index({ user: 1, createdAt: -1 });

const Note = mongoose.model('Note', NoteSchema);
export default Note;

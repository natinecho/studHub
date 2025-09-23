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

const Note = mongoose.model('Note', NoteSchema);
export default Note;

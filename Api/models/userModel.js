import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  bio:{type:String},
  profile_pic:{type:String, default:""},
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  whoCanAddMeToGroup: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

export default User;


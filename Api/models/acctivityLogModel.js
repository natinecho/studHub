import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
    {
        user:{type:mongoose.Schema.Types.ObjectId,ref: "User", required: true},
        type:{type:String, enum:["note","group","task","post"], required: true},
        title:{type:String},
        action:{type:String, required: true},
        targetId: { type: mongoose.Schema.Types.ObjectId }

    },
    {timestamps:true}
)

// The dashboard feed: this user's five newest entries of a few types.
activitySchema.index({ user: 1, type: 1, createdAt: -1 })

const Activity  = mongoose.model("Activity ",activitySchema)

export default Activity ;
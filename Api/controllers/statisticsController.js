import Note from "../models/noteModel.js";
import Group from "../models/groupModel.js";
import Todo from "../models/todoModel.js";
import Post from "../models/forumModels/postModel.js";

export const getAllstat = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId }).distinct("_id");

    // Time windows
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);

    // Helper to calculate % change safely
    const calcChange = (thisWeek, lastWeek) => {
      if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
      if (thisWeek === 0) return 0;

      return ((thisWeek - lastWeek) / lastWeek) * 100;
    };

    // NOTES
    const personalNotes = await Note.countDocuments({ user: userId });
    const groupNotes = await Note.countDocuments({ type: "group", group: { $in: groups } });
    const totalNotes = personalNotes + groupNotes;

    const thisWeekNotes = await Note.countDocuments({ user: userId, createdAt: { $gte: oneWeekAgo } });
    const lastWeekNotes = await Note.countDocuments({ user: userId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } });
    const notesChange = calcChange(thisWeekNotes, lastWeekNotes);

    // POSTS 
    const allPosts = await Post.countDocuments({ user: userId });
    const thisWeekPosts = await Post.countDocuments({ user: userId, createdAt: { $gte: oneWeekAgo } });
    const lastWeekPosts = await Post.countDocuments({ user: userId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } });
    const postChange = calcChange(thisWeekPosts, lastWeekPosts);

    // TASKS
    const completedPersonal = await Todo.countDocuments({
      type: "personal",
      "completions.user": userId,
      "completions.status": true
    });

    const completedGroup = await Todo.countDocuments({
      type: "group",
      "completions.user": userId,
      "completions.status": true
    });

    const totalCompleted = completedPersonal + completedGroup;

    const allAssignedTasks = await Todo.countDocuments({
      $or: [{ assignedMembers: userId }, { user: userId }]
    });

    const thisWeekTasks = await Todo.countDocuments({
      "completions.user": userId,
      "completions.status": true,
      updatedAt: { $gte: oneWeekAgo }
    });
    const lastWeekTasks = await Todo.countDocuments({
      "completions.user": userId,
      "completions.status": true,
      updatedAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    });
    const taskChange = calcChange(thisWeekTasks, lastWeekTasks);

    // GROUPS 
    const groupCount = groups.length;
    const thisWeekGroups = await Group.countDocuments({ members: userId, createdAt: { $gte: oneWeekAgo } });
    const lastWeekGroups = await Group.countDocuments({ members: userId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } });
    const groupChange = calcChange(thisWeekGroups, lastWeekGroups);

 
    return res.status(200).json({
      success: true,
      data: {
        notes: {
          personal: personalNotes,
          group: groupNotes,
          total: totalNotes,
          change: Number(notesChange.toFixed(1))
        },
        posts: {
          total: allPosts,
          change: Number(postChange.toFixed(1))
        },
        tasks: {
          completed: {
            personal: completedPersonal,
            group: completedGroup,
            total: totalCompleted,
          },
          assigned: allAssignedTasks,
          change: Number(taskChange.toFixed(1))
        },
        groups: {
          total: groupCount,
          change: Number(groupChange.toFixed(1))
        }
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to get all stats with weekly percentage change"
    });
  }
};

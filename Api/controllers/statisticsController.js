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

    // Every count below is independent of the others, so they are issued
    // together rather than one after another. Awaited in sequence this endpoint
    // cost the sum of fourteen round-trips; in parallel it costs the slowest
    // one. Only the group id list above has to come first — two of the counts
    // filter on it.
    const [
      // NOTES
      personalNotes,
      groupNotes,
      thisWeekNotes,
      lastWeekNotes,
      // POSTS
      allPosts,
      thisWeekPosts,
      lastWeekPosts,
      // TASKS
      completedPersonal,
      completedGroup,
      allAssignedTasks,
      thisWeekTasks,
      lastWeekTasks,
      // GROUPS
      thisWeekGroups,
      lastWeekGroups,
    ] = await Promise.all([
      // NOTES
      Note.countDocuments({ user: userId }),
      Note.countDocuments({ type: "group", group: { $in: groups } }),
      Note.countDocuments({ user: userId, createdAt: { $gte: oneWeekAgo } }),
      Note.countDocuments({ user: userId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }),

      // POSTS
      Post.countDocuments({ user: userId }),
      Post.countDocuments({ user: userId, createdAt: { $gte: oneWeekAgo } }),
      Post.countDocuments({ user: userId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }),

      // TASKS
      Todo.countDocuments({
        type: "personal",
        "completions.user": userId,
        "completions.status": true
      }),
      Todo.countDocuments({
        type: "group",
        "completions.user": userId,
        "completions.status": true
      }),
      Todo.countDocuments({
        $or: [{ assignedMembers: userId }, { user: userId }]
      }),
      Todo.countDocuments({
        "completions.user": userId,
        "completions.status": true,
        updatedAt: { $gte: oneWeekAgo }
      }),
      Todo.countDocuments({
        "completions.user": userId,
        "completions.status": true,
        updatedAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
      }),

      // GROUPS
      Group.countDocuments({ members: userId, createdAt: { $gte: oneWeekAgo } }),
      Group.countDocuments({ members: userId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }),
    ]);

    const totalNotes = personalNotes + groupNotes;
    const notesChange = calcChange(thisWeekNotes, lastWeekNotes);
    const postChange = calcChange(thisWeekPosts, lastWeekPosts);
    const totalCompleted = completedPersonal + completedGroup;
    const taskChange = calcChange(thisWeekTasks, lastWeekTasks);
    const groupCount = groups.length;
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

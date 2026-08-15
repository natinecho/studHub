import Activity from "../models/acctivityLogModel.js";

export const logActivity = async ({ user, type, action, title, targetId }) => {
  try {
    await Activity.create({ user, type, action, title, targetId });
  } catch (err) {
    console.error("Activity logging failed:", err.message);
  }
};

// The dashboard shows a glance, not an audit log: the five newest entries, and
// only the kinds worth surfacing (chat messages are deliberately not logged).
const RECENT_LIMIT = 5;
const RECENT_TYPES = ["note", "task", "post", "group"];

export const getRecentActivity = async (req, res) => {
  try {
    const activities = await Activity.find({
      user: req.user._id,
      type: { $in: RECENT_TYPES },
    })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .lean();

    res.status(200).json({
      success: true,
      data: activities.map((a) => ({
        type: a.type,
        action: a.action,
        title: a.title,
        date: a.createdAt,
      })),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch activity" });
  }
};

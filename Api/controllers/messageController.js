import Message from "../models/chatModels/messageModel.js";
import Conversation from "../models/chatModels/conversationModel.js";
import Group from "../models/groupModel.js";

// Deleted messages are gone as far as every reader is concerned; the row is
// kept only so an id stays resolvable.
const NOT_DELETED = { deletedAt: null };

// A reply needs a preview of what it answers: who wrote it, and the text.
const REPLY_POPULATE = {
  path: "replyTo",
  select: "content sender deletedAt",
  populate: { path: "sender", select: "username" },
};

export const getMessagesForConversation = async (req, res) => {
  try {
    const { id } = req.params;

    // Only members of the conversation may read it.
    const convo = await Conversation.findOne({ _id: id, members: req.user._id });
    if (!convo) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ conversation: id, ...NOT_DELETED })
      .populate("sender", "username profile_pic")
      .populate(REPLY_POPULATE)
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch messages", error: error.message });
  }
};

export const getMessagesForGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // Only members of the group may read its messages.
    const group = await Group.findOne({ _id: id, members: req.user._id });
    if (!group) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ group: id, ...NOT_DELETED })
      .populate("sender", "username profile_pic")
      .populate(REPLY_POPULATE)
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch messages", error: error.message });
  }
};

// Returns this user's direct conversations AND the groups they belong to,
// in one shape the chat list can render directly.
export const getAllConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ members: userId })
      .populate("members", "username profile_pic")
      .sort({ updatedAt: -1 })
      .lean();

    // Anything somebody else sent that this user hasn't been marked as having
    // seen is unread. Counted in one pass per thread kind.
    const unreadFor = async (field, ids) => {
      if (!ids.length) return {};
      const rows = await Message.aggregate([
        {
          $match: {
            [field]: { $in: ids },
            sender: { $ne: userId },
            seenBy: { $ne: userId },
            deletedAt: null,
          },
        },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      ]);
      return rows.reduce((acc, row) => {
        acc[row._id.toString()] = row.count;
        return acc;
      }, {});
    };

    const conversationIds = conversations.map((c) => c._id);
    const unreadDirect = await unreadFor("conversation", conversationIds);

    // The preview is the newest message that still exists — the conversation's
    // stored `lastMessage` may have been deleted since.
    const lastPerConversation = await Message.aggregate([
      { $match: { conversation: { $in: conversationIds }, deletedAt: null } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversation",
          content: { $first: "$content" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ]);
    const lastDirectMap = lastPerConversation.reduce((acc, row) => {
      acc[row._id.toString()] = row;
      return acc;
    }, {});

    const direct = conversations.map((c) => {
      const other = c.members.find(
        (m) => m._id.toString() !== userId.toString()
      );
      const last = lastDirectMap[c._id.toString()];
      return {
        _id: c._id,
        kind: "direct",
        name: other?.username || "Unknown",
        peerId: other?._id || null,
        profile_pic: other?.profile_pic || "",
        lastMessage: last?.content || "",
        updatedAt: last?.createdAt || c.updatedAt,
        unreadCount: unreadDirect[c._id.toString()] || 0,
      };
    });

    const groups = await Group.find({ members: userId })
      .select("name members updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    const groupIds = groups.map((g) => g._id);
    const lastPerGroup = await Message.aggregate([
      { $match: { group: { $in: groupIds }, deletedAt: null } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$group",
          content: { $first: "$content" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ]);
    const lastMap = lastPerGroup.reduce((acc, m) => {
      acc[m._id.toString()] = m;
      return acc;
    }, {});

    const unreadGroup = await unreadFor("group", groupIds);

    const groupConvos = groups.map((g) => {
      const last = lastMap[g._id.toString()];
      return {
        _id: g._id,
        kind: "group",
        name: g.name,
        memberCount: g.members.length,
        lastMessage: last?.content || "",
        updatedAt: last?.createdAt || g.updatedAt,
        unreadCount: unreadGroup[g._id.toString()] || 0,
      };
    });

    const all = [...direct, ...groupConvos].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    res.status(200).json(all);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch conversations", error: error.message });
  }
};


// export const getSeen = async (req, res) => {
//   const { messageIds } = req.body;
//   const userId = req.user.id;

//   if (!Array.isArray(messageIds)) return res.status(400).send("Invalid message IDs");

//   await Message.updateMany(
//     { _id: { $in: messageIds }, seenBy: { $ne: userId } },
//     { $addToSet: { seenBy: userId } }
//   );

//   res.send("Messages marked as seen");
// }

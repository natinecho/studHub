import Group from "../models/groupModel.js";
import GroupInvite from "../models/groupinviteModel.js";
import User from "../models/userModel.js";

import { logActivity } from "./ActivityController.js";

// CRUD for the group
export const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const user = req.user._id;

    const group = await Group.create({
      name,
      description,
      createdBy: user,
      members: [user],
      admins: [user],
    });

    //for recent acctivity endpoint
    await logActivity({
      user: req.user._id,
      type: "group",
      action: "Created a group",
      title: name,
      targetId: group._id,
    });

    res.status(201).json(group);
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Could not create group" });
  }
};
export const getGroup = async (req, res) => {
  try {
    // Members and admins are populated here, not just in getGroupByID: the
    // client used to load the list and then immediately fetch the first group
    // just to resolve these names, which made opening the screen two
    // round-trips deep. Populated once, the list already answers both.
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "username")
      .populate("admins", "username");

    if (!groups) {
      return res.status(404).json({ message: "no group found" });
    }

    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch groups" });
  }
};

export const getGroupByID = async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      members: req.user._id,
    })
      .populate("members", "username")
      .populate("admins", "username");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch group" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is an admin
    if (!group.admins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: "Only admins can update" });
    }

    const updates = {
      name: req.body.name ?? group.name,
      description: req.body.description ?? group.description,
    };

    const updatedGroup = await Group.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    res.status(200).json(updatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update group" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is an admin
    if (!group.admins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: "Only admins can delete" });
    }

    //for recent acctivity endpoint
    await logActivity({
      user: req.user._id,
      type: "group",
      action: "Deleted a group",
      title: group.name,
      targetId: group._id,
    });

    await Group.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Group deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete group" });
  }
};

// handle members
export const addMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const userToAdd = await User.findById(req.body.userId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!group.admins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: "Only admins can add" });
    }

    if (group.members.includes(userToAdd._id))
      return res.status(400).json({ message: "User is already a member" });

    if (userToAdd.whoCanAddMeToGroup) {
      await Group.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { members: userToAdd._id } },
        { new: true }
      );
      return res.status(200).json({ message: "User added" });
    } else {
      const inviteExists = await GroupInvite.findOne({
        group: group._id,
        invitedUser: userToAdd._id,
        status: "pending",
      });

      if (inviteExists) {
        return res.status(400).json({ message: "invite already sent" });
      }

      await GroupInvite.create({
        group: group._id,
        invitedUser: userToAdd._id,
        invitedBy: req.user._id,
      });

      return res.status(200).json({ message: "Invitation sent" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to Add a member" });
  }
};
export const removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.includes(req.user._id))
      return res.status(403).json({ message: "Only admins can remove" });

    group.members = group.members.filter(
      (id) => id.toString() !== req.params.userId
    );
    group.admins = group.admins.filter(
      (id) => id.toString() !== req.params.userId
    ); // in case they're admin
    await group.save();

    res.status(200).json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: "Error removing member" });
  }
};

//handle invite
export const getMyInvite = async (req, res) => {
  const invites = await GroupInvite.find({
    invitedUser: req.user._id,
    status: "pending",
  }).populate("group invitedBy", "name username");

  // Having no pending invites is a valid state, not a 404.
  res.status(200).json(invites);
};

export const acceptInvite = async (req, res) => {
  const invite = await GroupInvite.findOne({
    _id: req.params.inviteId,
    invitedUser: req.user._id,
    status: "pending",
  }).populate("group invitedBy", "name username");

  if (!invite) {
    return res.status(404).json({ message: "no invitation found" });
  }

  const group = await Group.findById(invite.group);

  if (group.members.includes(req.user._id)) {
    return res.status(400).json({ message: "you are already in the group" });
  }

  await Group.findOneAndUpdate(
    invite.group,
      { $addToSet: { members: req.user._id } },
    { new: true }
  );

  await GroupInvite.findOneAndUpdate(
    { _id: req.params.inviteId },
    {
      status: "accepted",
    },
    { new: true }
  );

  res.status(200).json({ message: "You joined the group" });
};

export const declineInvite = async (req, res) => {
  const invite = await GroupInvite.findOne({
    _id: req.params.inviteId,
    invitedUser: req.user._id,
    status: "pending",
  });

  if (!invite) {
    return res.status(404).json({ message: "no invitation found" });
  }

  await GroupInvite.findOneAndUpdate(
    { _id: req.params.inviteId },
    {
      status: "declined",
    },
    { new: true }
  );

  res.status(200).json({ message: "Invite declined" });
};

export const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.includes(req.user._id))
      return res.status(403).json({ message: "You're not in this group" });

    // This route has no :userId param — the leaver is the caller.
    const leaverId = req.user._id.toString();

    group.members = group.members.filter((id) => id.toString() !== leaverId);
    group.admins = group.admins.filter((id) => id.toString() !== leaverId); // in case they're admin
    await group.save();

    res.status(200).json({ message: "You left the group" });
  } catch (err) {
    res.status(500).json({ message: "Error leaving the Group" });
  }
};


//handle admin
export const promoteToAdmin = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.includes(req.user._id))
      return res.status(403).json({ message: "Only admins can promote" });

    if (!group.members.some((id) => id.toString() === req.params.userId))
      return res.status(400).json({ message: "That user is not a member" });

    if (!group.admins.includes(req.params.userId)) {
      // The activity belongs to the person being promoted, not to the group.
      await logActivity({
        user: req.params.userId,
        type: "group",
        action: "Promoted to be admin",
        title: group.name,
        targetId: group._id,
      });

      await Group.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { admins: req.params.userId } },
        { new: true }
      );
    }

    res.status(200).json({ message: "User promoted to admin" });
  } catch (err) {
    res.status(500).json({ message: "Error promoting member" });
  }
};

export const demoteAdmin = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.includes(req.user._id))
      return res.status(403).json({ message: "Only admins can demote" });

    if (!group.admins.some((id) => id.toString() === req.params.userId))
      return res.status(400).json({ message: "That user is not an admin" });

    // A group with no admins can never be administered again — the last one
    // has to promote a replacement before stepping down.
    if (group.admins.length <= 1)
      return res
        .status(400)
        .json({ message: "Promote another admin before demoting the last one" });

    group.admins = group.admins.filter(
      (id) => id.toString() !== req.params.userId
    );
    await group.save();

    await logActivity({
      user: req.params.userId,
      type: "group",
      action: "Removed as admin",
      title: group.name,
      targetId: group._id,
    });

    res.status(200).json({ message: "User demoted from admin" });
  } catch (err) {
    res.status(500).json({ message: "Error demoting member" });
  }
};


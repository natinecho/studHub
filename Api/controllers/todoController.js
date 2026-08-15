import ToDo from "../models/todoModel.js";
import Group from "../models/groupModel.js";
import { logActivity } from "./ActivityController.js";

export const createToDo = async (req, res) => {
  try {
    const {
      title,
      discription,
      category,
      priority,
      type,
      assignedMembers,
      deadline,
      groupId,
    } = req.body;

    if (type === "personal" && assignedMembers?.length > 0) {
      return res
        .status(400)
        .json({ message: "Personal tasks cannot have assigned members" });
    }

    let validAssigned = [];
    let completions = [];

    if (type === "group") {
      if (!groupId) {
        return res
          .status(400)
          .json({ message: "Group ID is required for group tasks" });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      if (!group.members.includes(req.user._id)) {
        return res
          .status(403)
          .json({ message: "You are not a member of this group" });
      }

      const notInGroup = assignedMembers.filter(
        (m) => !group.members.includes(m)
      );
      if (notInGroup?.length > 0) {
        return res
          .status(400)
          .json({
            message: "Some assigned members are not part of this group",
          });
      }

      validAssigned = assignedMembers;
      completions = validAssigned.map((m) => ({ user: m, status: false }));
    }

    if (type === "personal") {
      validAssigned = [req.user._id];
      completions = [{ user: req.user._id, status: false }];
    }

    const todo = await ToDo.create({
      user: req.user._id,
      title,
      discription,
      category,
      priority,
      type,
      group: type === "group" ? groupId : null,
      assignedMembers: validAssigned,
      deadline,
      completions,
    });

    //for recent acctivity endpoint
    await logActivity({
      user: req.user._id,
      type: "task",
      action: "Created a task",
      title: todo.title,
      targetId: todo._id,
    });

    res.status(201).json({ message: "ToDo created successfully", ToDo: todo });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Failed to create ToDo", error: error.message });
  }
};

export const getToDos = async (req, res) => {
  try {
    const { priority, completed, type, sortBy } = req.query;

    // A task is visible if you created it OR it was assigned to you.
    const filter = {
      $or: [{ user: req.user._id }, { assignedMembers: req.user._id }],
    };

    if (priority) filter.priority = priority;
    if (type) filter.type = type;

    // `completed` lives per-user inside `completions`, not as a top-level field.
    if (completed !== undefined) {
      filter.completions = {
        $elemMatch: { user: req.user._id, status: completed === "true" },
      };
    }

    let query = ToDo.find(filter)
      .populate("assignedMembers", "username profile_pic")
      .populate("group", "name");

    if (sortBy === "deadline") query = query.sort({ deadline: 1 });

    const todos = await query.lean();

    // Surface this user's own completion state so clients don't have to dig.
    const withCompletion = todos.map((t) => ({
      ...t,
      completed:
        t.completions?.find(
          (c) => c.user?.toString() === req.user._id.toString()
        )?.status ?? false,
    }));

    // "high" > "medium" > "low" — a plain sort would order them alphabetically.
    if (sortBy === "priority") {
      const rank = { high: 0, medium: 1, low: 2 };
      withCompletion.sort((a, b) => rank[a.priority] - rank[b.priority]);
    }

    res.status(200).json(withCompletion);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch ToDos", error: error.message });
  }
};

export const getToDoById = async (req, res) => {
  try {
    const todo = await ToDo.findOne({ _id: req.params.id, user: req.user._id });

    if (!todo) return res.status(404).send({ message: "ToDo not found" });

    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch ToDo", error });
  }
};

export const updateToDo = async (req, res) => {
  try {
    const {
      title,
      discription,
      category,
      priority,
      type,
      groupId,
      assignedMembers,
      deadline,
    } = req.body;

    const todo = await ToDo.findOne({ _id: req.params.id, user: req.user._id });
    if (!todo) return res.status(404).json({ message: "ToDo not found" });

    if (
      (type === "personal" || todo.type === "personal") &&
      assignedMembers?.length > 0
    ) {
      return res
        .status(400)
        .json({ message: "Personal tasks cannot have assigned members" });
    }

    todo.title = title ?? todo.title;
    todo.discription = discription ?? todo.discription;
    todo.category = category ?? todo.category;
    todo.priority = priority ?? todo.priority;
    // `deadline` is the one field a user can deliberately empty, so an explicit
    // "" or null clears it. `?? todo.deadline` alone made a due date permanent.
    if (deadline !== undefined) todo.deadline = deadline || null;

    // The type itself was never written back, so switching a task between
    // personal and group changed the members but left it the type it started as.
    const nextType = type ?? todo.type;

    if (nextType === "group") {
      if (groupId) todo.group = groupId;
      if (!todo.group) {
        return res
          .status(400)
          .json({ message: "Group tasks need a group" });
      }

      // Only touch the roster when the caller actually sent one. Reading
      // `.forEach` off an absent list is what turned a partial update into a 500.
      if (assignedMembers !== undefined) {
        const members = (assignedMembers || []).map((m) => m.toString());
        const existing = todo.completions.map((c) => c.user.toString());

        todo.assignedMembers = members;
        for (const member of members) {
          if (!existing.includes(member)) {
            todo.completions.push({ user: member, status: false });
          }
        }
        // Someone unassigned should not keep counting toward the task.
        todo.completions = todo.completions.filter((c) =>
          members.includes(c.user.toString())
        );
      }
    } else {
      todo.group = null;
      todo.assignedMembers = [];
      // Demoting to personal keeps the owner's own tick rather than resetting
      // it — the task did not become un-done just because it stopped being shared.
      const mine = todo.completions.find(
        (c) => c.user.toString() === req.user._id.toString()
      );
      todo.completions = [
        { user: req.user._id, status: mine ? mine.status : false },
      ];
    }

    todo.type = nextType;

    //for recent acctivity endpoint
    await logActivity({
      user: req.user._id,
      type: "task",
      action: "Updated a task",
      title: todo.title,
      targetId: todo._id,
    });


    await todo.save();
    res.status(200).json(todo);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update ToDo", error: error.message });
  }
};

export const deleteToDo = async (req, res) => {
  try {
    const todo = await ToDo.findById(req.params.id);

    if (!todo) return res.status(404).json({ message: "ToDo not found" });

    if (todo.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Only the creator of this task can delete it" });
    }

    //for recent acctivity endpoint
    await logActivity({
      user: req.user._id,
      type: "task",
      action: "Deleted a task",
      title: todo.title,
      targetId: todo._id,
    });

    await todo.deleteOne();

    res.status(200).json({ message: "ToDo deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete ToDo", error: error.message });
  }
};

export const toggleCompletion = async (req, res) => {
  try {
    const todo = await ToDo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: "ToDo not found" });

    const completion = todo.completions.find(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!completion) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this task" });
    }

    completion.status = !completion.status;
    await todo.save();

    res.status(200).json({ message: "Your task status updated" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to toggle status", error: error.message });
  }
};

import ToDo from "../models/todoModel.js";
import Group from "../models/groupModel.js"

export const createToDo = async (req, res) => {
  try {
    const { title, discription, priority, type, assignedMembers, deadline, groupId } = req.body;

    if (type === "personal" && assignedMembers?.length > 0) {
      return res
        .status(400)
        .json({ message: "Personal tasks cannot have assigned members" });
    }

    let validAssigned = [];
    let completions = [];

    if (type === "group") {
      if (!groupId) {
        return res.status(400).json({ message: "Group ID is required for group tasks" });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      if (!group.members.includes(req.user._id)) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const notInGroup = assignedMembers.filter((m) => !group.members.includes(m));
      if (notInGroup?.length > 0) {
        return res.status(400).json({ message: "Some assigned members are not part of this group" });
      }

      validAssigned = assignedMembers;
      completions = validAssigned.map((m) => ({ user: m, status: false }));
    }

    if (type === "personal") {
      completions = [{ user: req.user._id, status: false }];
    }

    const todo = await ToDo.create({
      user: req.user._id,
      title,
      discription,
      priority,
      type,
      group: type === "group" ? groupId : null,
      assignedMembers: validAssigned,
      deadline,
      completions,
    });

    res.status(201).json({ message: "ToDo created successfully", ToDo: todo });
  } catch (error) {
    res.status(400).json({ message: "Failed to create ToDo", error: error.message });
  }
};


export const getToDos = async (req, res) => {
  try {
    const { priority, completed, type, sortBy } = req.query;
    const filter = { user: req.user._id };

    if (priority) filter.priority = priority;
    if (completed) filter.completed = completed === "true";
    if (type) filter.type = type;

    let query = ToDo.find(filter);

    if (sortBy === "deadline") query = query.sort({ deadline: 1 });
    if (sortBy === "priority") query = query.sort({ priority: 1 });

    const todos = await query;
    res.status(200).json(todos);
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
    const { title, discription, priority, type, assignedMembers, deadline } = req.body;

    const todo = await ToDo.findOne({ _id: req.params.id, user: req.user._id });
    if (!todo) return res.status(404).json({ message: "ToDo not found" });

    if ((type === "personal" || todo.type === "personal"  ) && assignedMembers?.length > 0) {
      return res.status(400).json({ message: "Personal tasks cannot have assigned members" });
    }

    todo.title = title ?? todo.title;
    todo.discription = discription ?? todo.discription;
    todo.priority = priority ?? todo.priority;
    todo.deadline = deadline ?? todo.deadline;
    
    if (type === "group" || todo.type === "group" ) {
      console.log("hehehe i was here")
      todo.assignedMembers = assignedMembers;

      // ensure completions are synced
      const existing = todo.completions.map((c) => c.user.toString());
      assignedMembers.forEach((m) => {
        if (!existing.includes(m.toString())) {
          todo.completions.push({ user: m, status: false });
        }
      });
      // remove completions of users no longer assigned
      todo.completions = todo.completions.filter((c) =>
        assignedMembers.includes(c.user.toString())
      );
    }

    if (type === "personal") {
      todo.assignedMembers = [];
      todo.completions = [{ user: req.user._id, status: false }];
    }

    await todo.save();
    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to update ToDo", error: error.message });
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
      return res.status(403).json({ message: "You are not assigned to this task" });
    }

    completion.status = !completion.status;
    await todo.save();

    res.status(200).json({ message: "Your task status updated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle status", error: error.message });
  }
};

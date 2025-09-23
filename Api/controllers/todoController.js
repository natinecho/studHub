import ToDo from "../models/todoModel.js";

export const createToDo = async (req, res) => {
  try {
    const { title, discription, priority, type, assignedMembers, deadline } = req.body;

    if (type === "personal" && assignedMembers?.length > 0) {
      return res
        .status(400)
        .json({ message: "Personal tasks cannot have assigned members" });
    }

    const todo = await ToDo.create({
      user: req.user._id,
      title,
      discription,
      priority,
      type,
      assignedMembers: type === "group" ? assignedMembers : [],
      deadline,
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
    const { title, discription, completed, priority, type,assignedMembers,deadline,} = req.body;

    if (type === "personal" && assignedMembers?.length > 0) {
      return res
        .status(400)
        .json({ message: "Personal tasks cannot have assigned members" });
    }

    const todo = await ToDo.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        title,
        discription,
        completed,
        priority,
        type,
        assignedMembers: type === "group" ? assignedMembers : [],
        deadline,
      },
      { new: true }
    );

    if (!todo) return res.status(404).json({ message: "ToDo not found" });

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
    const todo = await ToDo.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user._id }, 
        { assignedMembers: req.user._id }, 
      ],
    });
    
    if (!todo) return res.status(404).json({ message: "ToDo not found" });

    todo.completed = !todo.completed;
    await todo.save();

    res.status(200).json({ message: "ToDo status updated", todo });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to toggle status", error: error.message });
  }
};

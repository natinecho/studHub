import ToDo from "../models/todoModel.js";

export const createToDo = async (req, res) => {
  try {
    const { title, discription} = req.body;

    const todo = await ToDo.create({
      user: req.user._id,
      title,
      discription,
    });

    res.status(201).json({ message: "ToDo created successfully", ToDo: todo });
  } catch (error) {
    res.status(400).json({ message: "Failed to create ToDo", error });
  }
};

export const getToDos = async (req, res) => {
  try {
    const ToDos = await ToDo.find({ user: req.user._id })

    res.status(200).json(ToDos);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch ToDos", error });
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
    const { title, discription,completed } = req.body;

    const todo = await ToDo.findByIdAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        title,
        discription,
        completed,
      },
      { new: true }
    );

    if (!todo) return res.status(404).send({ message: "ToDo not found" });

    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to update ToDo", error });
  }
};

export const deleteToDo = async(req,res) => {
  try {
    const todo = await ToDo.findByIdAndDelete({ _id: req.params.id, user: req.user._id });

    if (!todo) return res.status(404).send({ message: "ToDo not found" });

    res.status(200).json({message:"ToDo deleted"});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch ToDo", error });
  }
}

import Note from "../models/noteModel.js";

export const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    const note = await Note.create({
      user: req.user._id,
      title,
      content,
    });

    res.status(201).json({ message: "Note created successfully", note: note });
  } catch (error) {
    res.status(400).json({ message: "Failed to create note", error });
  }
};

export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({
      updatedAt: -1,
    });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notes", error });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) return res.status(404).send({ message: "Note not found" });

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch note", error });
  }
};

export const updateNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    const note = await Note.findByIdAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        title,
        content,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!note) return res.status(404).send({ message: "Note not found" });

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to update note", error });
  }
};

export const deleteNote = async(req,res) => {
  try {
    const note = await Note.findByIdAndDelete({ _id: req.params.id, user: req.user._id });

    if (!note) return res.status(404).send({ message: "Note not found" });

    res.status(200).json({message:"Note deleted"});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch note", error });
  }
}

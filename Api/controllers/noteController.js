import Note from "../models/noteModel.js";
import Group from "../models/groupModel.js";
import { v4 as uuidv4 } from "uuid";
import puppeteer from 'puppeteer';


export const createNote = async (req, res) => {
  try {
    const { title, content, type, group: groupId, tags } = req.body;

    if (type === "group") {
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(req.user._id)) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
    }

    const note = await Note.create({
      user: req.user._id,
      title,
      content,
      type: type || "personal",
      group: type === "group" ? groupId : null,
      tags,
    });

    res.status(201).json({ message: "Note created successfully", note });
  } catch (error) {
    res.status(400).json({ message: "Failed to create note", error: error.message });
  }
};

export const getNotes = async (req, res) => {
  try {
    const { search, type, tags, startDate, endDate } = req.query;

    const groups = await Group.find({ members: req.user._id }).distinct("_id");

    let query = {
      $or: [
        { user: req.user._id }, // personal notes
        { type: "group", group: { $in: groups } }, // group notes user can access
      ],
    };

    //Search by title/content (case-insensitive)
    if (search) {
      query.$and = [
        {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { content: { $ : search, $options: "i" } },
          ],
        },
      ];
    }

    // Filter 
    if (type) {
      query.type = type; // "personal" or "group"
    }

    if (tags) {
      const tagsArray = tags.split(",").map(tag => tag.trim());
      query.tags = { $in: tagsArray };
    }

    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) query.updatedAt.$gte = new Date(startDate);
      if (endDate) query.updatedAt.$lte = new Date(endDate);
    }

    // const notes = await Note.find(query).sort({ updatedAt: -1 });

    // res.status(200).json(notes);

    //Fetch notes
    const notes = await Note.find(query)
      .sort({ updatedAt: -1 })
      .select("title owner contributors tags updatedAt content") // select fields
      .lean(); // converts Mongoose documents to plain JS objects

    // Add snippet (first 200 chars of content)
    const notesWithSnippet = notes.map(note => ({
      ...note,
      no_contributors: note.collaborators.length(),
      snippet: note.content.replace(/<[^>]*>?/gm, "").slice(0, 200), // remove HTML tags, first 200 chars
      content: undefined, // remove full content from list
      collaborators: undefined, 
    }));

    res.status(200).json(notesWithSnippet);
    
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notes", error: error.message });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Permission check
    if (note.type === "group") {
      const group = await Group.findById(note.group);
      if (!group.members.includes(req.user._id)) {
        return res.status(403).json({ message: "Access denied: You are not allowed to view this group note" });
      }
    } else if (note.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied: You are not allowed to view this note " });
    }

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch note", error: error.message });
  }
};

export const updateNote = async (req, res) => {
  try {
    const { title, content, tags, type, groupId } = req.body;

    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    const isOwner = note.user.toString() === req.user._id.toString();

    if (note.type === "group") {
      const group = await Group.findById(note.group);
      if (!group.members.includes(req.user._id)) {
        return res.status(403).json({ message: "You are not allowed to edit this group note" });
      }
    } else if (!isOwner) {
      return res.status(403).json({ message: "You are not allowed to edit this note" });
    }

    // Validate type change (only owner can change type)
    if (type && type !== note.type && !isOwner) {
      return res.status(403).json({ message: "Only the owner can change the note type" });
    }

    //Handle type change
    if (type) {
      note.type = type;

      if (type === "group") {
        if (!groupId) {
          return res.status(400).json({ message: "Group ID is required for group notes" });
        }

        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(req.user._id)) {
          return res.status(403).json({ message: "You are not a member of the selected group" });
        }

        note.group = groupId;
      } else if (type === "personal") {
        note.group = null;
        note.collaborators = []; // reset collaborators
      }
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (tags !== undefined) note.tags = tags;

    note.updatedAt = Date.now();

    // Track collaborators for group notes
    if (note.type === "group" && !note.collaborators.includes(req.user._id)) {
      note.collaborators.push(req.user._id);
    }

    await note.save();
    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to update note", error: error.message });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Only owner can delete
    if (note.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can delete this note" });
    }

    await note.deleteOne();
    res.status(200).json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete note", error: error.message });
  }
};


// sharable link
export const generateShareLink = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Only owner can generate share link
    if (note.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can share this note" });
    }

    note.shareLink = uuidv4();
    await note.save();

    res.status(200).json({
      message: "Shareable link generated",
      shareUrl: `${process.env.FRONTEND_URL}/notes/share/${note.shareLink}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate share link", error: error.message });
  }
};

export const getNoteByShareLink = async (req, res) => {
  try {
    const note = await Note.findOne({ shareLink: req.params.shareLink });
    if (!note) return res.status(404).json({ message: "Note not found" });

    // public data for every one
    let responseData = {
      title: note.title,
      content: note.content,
      tags: note.tags,
      type: note.type,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };

    if (req.user) {
      const userId = req.user._id.toString();
      const isOwner = note.user.toString() === userId;

      if (isOwner) {
        // Owner → full access
        responseData = note.toObject(); 
      } else if (note.type === "group") {
        const group = await Group.findById(note.group);
        if (group && group.members.map(id => id.toString()).includes(userId)) {
          // Group member → full access
          responseData = note.toObject();
        }
      }
    }

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch note", error: error.message });
  }
};


// export the Note to PDF
export const exportNotePDF = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Permission check
    if (note.type === "group") {
      const group = await Group.findById(note.group);
      if (!group.members.includes(req.user._id)) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (note.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Launch Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(note.content, { waitUntil: 'networkidle0' });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${note.title}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    res.status(500).json({ message: "Failed to export note", error: error.message });
  }
};
import Note from "../models/noteModel.js";
import { chatWithAI, SummarizeNote } from "../services/AIService.js";

export const AIChat = async (req, res) => {
  const { message, history } = req.body;

  try {
    // Guarded: a request without `history` used to throw here — before the
    // validation below even ran — and came back as a 500 with no explanation.
    const trimmedHistory = Array.isArray(history) ? history.slice(-10) : []; // last 10 converstations

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        data: { message: "Empty message not allowed." },
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        data: { message: "Message too long." },
      });
    }

    const response = await chatWithAI(message, trimmedHistory);

    if (response.success == 0) {
      // The service knows *why* it failed — a daily quota trip is a 429 the
      // student can retry, not an unexplained server fault.
      return res.status(response.status ?? 500).json({
        success: false,
        data: { message: response.error ?? "failed to chat with AI" },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        detailed: response.detailed,
        summary: response.summary,
      },
    });
  } catch (err) {
    console.error("[AIChat]", err);
    return res.status(500).json({
      success: false,
      data: { message: "failed to chat with AI" },
    });
  }
};

export const getSummarizedNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id });

    if (!note) {
      return res.status(404).json({
        success: false,
        data: { message: " no such note" },
      });
    }

    const response = await SummarizeNote(
      `this is the title: ${note.title}  and this is the content:  ${note.content} `
    );

    if (response.success == 0) {
      return res.status(response.status ?? 500).json({
        success: false,
        data: { message: response.error ?? "failed to summarize the note" },
      });
    }

    return res.status(200).json({
      success: true,
      data: { summary: response.summary },
    });
  } catch (err) {
    console.error("[AISummarizeNote]", err);
    return res.status(500).json({
      success: false,
      data: { message: "failed to summarize the note" },
    });
  }
};


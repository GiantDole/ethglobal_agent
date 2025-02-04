import { Request, Response } from "express";
import { processConversation } from "../services/aiService";

export async function handleConversation(req: Request, res: Response): Promise<Response> {
    const { userInput, conversationState } = req.body;

    if (!userInput) {
        return res.status(400).json({ error: "Missing input" });
    }

    try {
        const response = await processConversation(userInput, conversationState);
        return res.json(response);
    } catch (error) {
        return res.status(500).json({ error: "Error processing conversation" });
    }
}

import { Request, Response } from 'express';
import { processConversation } from '../services/interactionService';

export const handleConversation = async (req: Request, res: Response) => {
  const { tokenId } = req.params;
  const { userInput, conversationState } = req.body;

  // Validate the input data
  if (!userInput) {
    return res.status(400).json({ error: 'Missing user input' });
  }

  try {
    // Process the conversation
    const result = await processConversation(userInput, conversationState);

    // Respond with the AI result
    return res.json({
      message: result.nextMessage,
      shouldContinue: result.shouldContinue,
      decision: result.decision,
    });
  } catch (error) {
    console.error('Error processing conversation:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

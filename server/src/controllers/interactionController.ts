import { Request, Response } from 'express';
import { processConversation } from '../services/interactionService';
import { getProjectConversationHistory } from '../services/projectService';
import { privyService } from '../services/privyServiceSingleton';

export const handleConversation = async (req: Request, res: Response) => {
  const { tokenId } = req.params;
  const { userInput } = req.body;
  const userId = await privyService.getUserIdFromAccessToken(req);

  const conversationHistory = await getProjectConversationHistory({projectId: tokenId, userId});
  // Validate the input data
  if (conversationHistory && !userInput) {
    return res.status(400).json({ error: 'Missing user input' });
  }

  try {
    // Process the conversation
    const result = await processConversation(userInput, conversationHistory);

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

export const getSignature = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { answer } = req.body;

  // Validate the input data
  // Require that the interaction was successful
}



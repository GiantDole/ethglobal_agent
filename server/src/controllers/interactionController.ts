import { Request, Response } from 'express';
import { processConversation } from '../services/interactionService';
import { getProjectConversationHistory, getProjectToken } from '../services/projectService';
import { privyService } from '../services/privyServiceSingleton';
import { generateSignature as generateUserSignature } from '../services/userService';

export const handleConversation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { tokenId } = req.params;
    const { userInput } = req.body;
    const userId = await privyService.getUserIdFromAccessToken(req);

    const conversationHistory = await getProjectConversationHistory({ projectId: tokenId, userId });
    
    // Validate input early
    if (conversationHistory && !userInput) {
      return res.status(400).json({ error: 'Missing user input' });
    }

    const result = await processConversation(userInput, conversationHistory);
    return res.status(200).json({
      message: result.nextMessage,
      shouldContinue: result.shouldContinue,
      decision: result.decision,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing conversation:', errorMessage);
    return res.status(500).json({ error: `Failed to process conversation: ${errorMessage}` });
  }
};

//TODO: make sure the user session was successful and all the relevant data is stored in redis
export const generateSignature = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { projectId } = req.params;
    const { userWalletAddress } = req.body;

    const tokenData = await getProjectToken(projectId);
    if (!tokenData || !tokenData.token_address) {
      return res.status(404).json({ error: 'Token address not found for project' });
    }
    const tokenAddress: string = tokenData.token_address;

    const userId = await privyService.getUserIdFromAccessToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const signature: string = await generateUserSignature(userId, projectId, userWalletAddress, tokenAddress);
    return res.status(200).json({ signature });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating signature:', errorMessage);
    return res.status(500).json({ error: `Failed to generate signature: ${errorMessage}` });
  }
};
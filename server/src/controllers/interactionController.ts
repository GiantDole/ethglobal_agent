import { Request, Response } from 'express';
import { processConversation } from '../services/interactionService';
import { getProjectConversationHistory, updateProjectConversationHistory, resetProjectConversation } from '../services/projectService';
import { privyService } from '../services/privyServiceSingleton';

export const handleConversation = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { answer, reset } = req.body; // Add reset flag to request body
  
  const userId = await privyService.getUserIdFromAccessToken(req);

  try {
    let conversationState;
    
    if (reset) {
      // Reset the conversation if requested
      conversationState = await resetProjectConversation({ projectId, userId });
    } else {
      conversationState = await getProjectConversationHistory({ projectId, userId });
    }

    // Process the conversation
    const result = await processConversation(answer, conversationState);
    
    // Update the conversation state in Redis
    await updateProjectConversationHistory({
      projectId,
      userId,
      conversationState: result.conversationState
    });

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



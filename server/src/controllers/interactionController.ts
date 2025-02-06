import { Request, Response } from 'express';
import { processConversation } from '../services/interactionService';
import { setProjectConversationHistory, getProjectConversationHistory } from '../services/projectService';
import { privyService } from '../services/privyServiceSingleton';

export const handleConversation = async (req: Request, res: Response) => {
  console.log('⭐ Starting handleConversation with params:', { tokenId: req.params.tokenId });
  
  const tokenId = req.params.projectId;
  const userInput = req.body.answer;
  console.log('📝 Received user input:', req.body);
  
  const userId = await privyService.getUserIdFromAccessToken(req);
  console.log('👤 Retrieved userId:', userId);

  const conversationHistory = await getProjectConversationHistory({projectId: tokenId, userId});
  console.log('💬 Conversation history length:', conversationHistory || 0);
  
  // Validate the input data
  if (conversationHistory && !userInput) {
    console.log('❌ Validation failed: Missing user input');
    return res.status(400).json({ error: 'Missing user input' });
  }

  try {
    console.log('🔄 Processing conversation...');
    // Process the conversation
    const result = await processConversation(userInput, conversationHistory);
    await setProjectConversationHistory(tokenId, userId, result.conversationState);

    // Respond with the AI result
    return res.json({
      message: result.nextMessage,
      shouldContinue: result.shouldContinue,
      decision: result.decision,
    });
  } catch (error) {
    console.error('❌ Error processing conversation:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getSignature = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { answer } = req.body;

  // Validate the input data
  // Require that the interaction was successful
}



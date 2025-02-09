import { Request, Response } from 'express';
import { getProjectConversationHistory, getProjectToken, resetProjectConversation, updateProjectConversationHistory } from '../services/projectService';
import { getTokenAllocation, saveProjectInteraction } from '../services/interactionService';
import { privyService } from '../services/privyServiceSingleton';
import { generateSignature as generateUserSignature } from '../services/userService';
import { AgentService } from '../services/agentService';
import logger from '../config/logger';
import { checkSuccessfulInteraction } from '../services/interactionService';
import redis from '../database/redis';

export class InteractionController {
  private agentService: AgentService;

	constructor() {
		this.agentService = new AgentService();
	}

	async evaluateResponse(req: Request, res: Response): Promise<Response> {
		try {
			const { projectId } = req.params;
			var { answer, reset } = req.body;
			const userId = await privyService.getUserIdFromAccessToken(req);

      logger.info({user: userId, answer, projectId}, 'Evaluating user response for project.');

      let conversationState;
    
      if (reset) {
        // Reset the conversation if requested
        conversationState = await resetProjectConversation({ projectId, userId });
      } else {
        conversationState = await getProjectConversationHistory({ projectId, userId });
      }

      if (conversationState.history.length !== 0 && !answer) {
        return res.status(400).json({ error: 'Missing user input' });
      }

      if(conversationState.history.length === 0) {
        answer = "Requesting first question...";
      }
      
      const result = await this.agentService.evaluateResponse(answer, conversationState);

      if (result.decision === "accept" || result.decision === "reject") {
        result.conversationState.access = result.decision === "accept";
        result.conversationState.final = true;
        await saveProjectInteraction({
          projectId,
          userId,
          conversationState: result.conversationState,
          decision: result.decision
        });

        if (result.decision === "accept") {
          result.conversationState.tokenAllocation = await getTokenAllocation({
            projectId,
            userId,
            knowledgeScore: result.knowledgeScore,
            vibeScore: result.vibeScore
          });
        }
      }

      await updateProjectConversationHistory({
        projectId,
        userId,
        conversationState: result.conversationState
      });

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

  async checkSuccessfulInteraction(req: Request, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const userId = await privyService.getUserIdFromAccessToken(req);

      const hasSuccessfulInteraction = await checkSuccessfulInteraction({
        projectId,
        privyId: userId
      });

      return res.status(200).json({ 
        success: hasSuccessfulInteraction 
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error checking successful interaction:', errorMessage);
      return res.status(500).json({ 
        error: `Failed to check interaction: ${errorMessage}` 
      });
    }
  }

}

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
    
    const userSession = await redis.get(`session:${userId}`);
    if (!userSession) {
      return res.status(401).json({ error: 'User session not found' });
    }
    const sessionData = JSON.parse(userSession);
    
    if (sessionData.walletAddress !== "" && sessionData.walletAddress !== userWalletAddress) {
      return res.status(401).json({ error: 'User claimed signature for a different wallet address already' });
    } else if (sessionData.walletAddress === "") {
      if (userWalletAddress === "") {
        return res.status(401).json({ error: 'User wallet address is required' });
      }
      sessionData.walletAddress = userWalletAddress;
    }

    const signatureData = await generateUserSignature(userId, projectId, userWalletAddress, tokenAddress);
    return res.status(200).json({ ...signatureData });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating signature:', errorMessage);
    return res.status(500).json({ error: `Failed to generate signature: ${errorMessage}` });
  }
};

export const interactionController = new InteractionController();
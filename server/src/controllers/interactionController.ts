import { Request, Response } from 'express';
import { getProjectConversationHistory, getProjectToken, resetProjectConversation, updateProjectConversationHistory } from '../services/projectService';
import { privyService } from '../services/privyServiceSingleton';
import { generateSignature as generateUserSignature } from '../services/userService';
import { AgentService } from '../services/agentService';

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

      let conversationState;
      //TODO: where is answer added
    
      if (reset) {
        // Reset the conversation if requested
        conversationState = await resetProjectConversation({ projectId, userId });
      } else {
        conversationState = await getProjectConversationHistory({ projectId, userId });
      }

      if (conversationState.history.length !== 0 && !answer) {
        return res.status(400).json({ error: 'Missing user input' });
      }

      const result = await this.agentService.evaluateResponse(answer, conversationState);

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

    const signature: string = await generateUserSignature(userId, projectId, userWalletAddress, tokenAddress);
    return res.status(200).json({ signature });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating signature:', errorMessage);
    return res.status(500).json({ error: `Failed to generate signature: ${errorMessage}` });
  }
};

export const interactionController = new InteractionController();

/*
import { Request, Response } from "express";
// import { getProjectConversationHistory } from "../services/projectService";
import { privyService } from "../services/privyServiceSingleton";
import { AgentService } from "../services/agentService";


export class InteractionController {
	private agentService: AgentService;

	constructor() {
		this.agentService = new AgentService();
	}

	async evaluateResponse(req: Request, res: Response) {
		const userId = await privyService.getUserIdFromAccessToken(req);
		if (!userId) {
			res.status(401).json({ message: "Unauthorized: Invalid privy token" });
			return;
		}

		try {
			const sessionKey = `session:${userId}`;
			const sessionData = await redis.get(sessionKey);
			if (!sessionData) {
				res.status(401).json({
					message: "Unauthorized: Session does not exist or has expired",
				});
				return;
			}
			const { question, answer } = req.body;

			if (!question) {
				return res.status(400).json({
					error: "Question is required",
				});
			}

			if (!answer) {
				return res.status(400).json({
					error: "Answer is required",
				});
			}

			const result = await this.agentService.evaluateResponse(
				sessionData,
				question,
				answer
			);
			return res.json(result);
		} catch (error) {
			console.error("Agent evaluation error:", error);
			return res.status(500).json({
				error: "Internal server error",
			});
		}
	}
}
*/
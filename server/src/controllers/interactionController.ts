import { Request, Response } from "express";
// import { getProjectConversationHistory } from "../services/projectService";
import { privyService } from "../services/privyServiceSingleton";
import { AgentService } from "../services/agentService";

import redis from "../database/redis";

export const getSignature = async (req: Request, res: Response) => {
	const { projectId } = req.params;
	const { answer } = req.body;

	// Validate the input data
	// Require that the interaction was successful
};

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

export const interactionController = new InteractionController();

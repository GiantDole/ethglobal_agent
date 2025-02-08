import { Request, Response } from "express";
// import { getProjectConversationHistory } from "../services/projectService";
import { privyService } from "../services/privyServiceSingleton";
import { AgentService } from "../services/agentService";

const agentService = new AgentService();

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
		try {
			const { walletAddress, question, answer } = req.body;
			if (!walletAddress) {
				return res.status(400).json({
					error: "Wallet Address is required",
				});
			}
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
				walletAddress,
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

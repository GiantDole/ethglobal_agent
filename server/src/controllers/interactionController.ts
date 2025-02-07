import { Request, Response } from "express";
import { processConversation } from "../services/interactionService";
import { getProjectConversationHistory } from "../services/projectService";
import { privyService } from "../services/privyServiceSingleton";
import { AgentService } from "../services/agentService";

const agentService = new AgentService();

export const handleConversation = async (req: Request, res: Response) => {
	const { tokenId } = req.params;
	const { walletAddress, question, answer } = req.body;

	try {
		const userId = await privyService.getUserIdFromAccessToken(req);
		if (!userId) {
			return res.status(400).json({
				error: "User id is required",
			});
		}

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

		// Use agent service to evaluate response and get next question
		const result = await agentService.evaluateResponse(
			walletAddress,
			question,
			answer
		);

		return res.json(result);
	} catch (error) {
		console.error("Error processing conversation:", error);
		return res.status(500).json({ error: "Internal Server Error" });
	}
};

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

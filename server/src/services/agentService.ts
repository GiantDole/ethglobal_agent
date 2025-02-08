import { KnowledgeAgent } from "../agents/knowledge/KnowledgeAgent";
import { VibeAgent } from "../agents/vibe/VibeAgent";
import { ConversationState } from "./interactionService";

export class AgentService {
	private knowledgeAgent: KnowledgeAgent;
	private vibeAgent: VibeAgent;

	constructor() {
		this.knowledgeAgent = new KnowledgeAgent();
		this.vibeAgent = new VibeAgent();
	}

	async evaluateResponse(
		question: string,
		conversationState: ConversationState | null
	) {
		const conversationHistory = conversationState?.history || [];
		const walletAddress = "0x0000000000000000000000000000000000000000";
		const answer = "test";
		try {
			const [knowledgeEval, vibeEval] = await Promise.all([
				this.knowledgeAgent.evaluateAnswer(walletAddress, question, answer),
				this.vibeAgent.evaluateAnswer(walletAddress, question, answer),
			]);
			console.log(knowledgeEval, vibeEval);

			return {
				nextMessage:
					knowledgeEval.score > vibeEval.score
						? vibeEval.nextQuestion
						: knowledgeEval.nextQuestion,
				shouldContinue: knowledgeEval.score >= 1 && vibeEval.score >= 1,
				decision:
					!knowledgeEval.nextQuestion || !vibeEval.nextQuestion
						? "complete"
						: "pending",
			};
		} catch (error) {
			console.error("Error in agent evaluation:", error);
			throw error;
		}
	}

	clearMemory(walletAddress: string) {
		this.knowledgeAgent.clearWalletMemory(walletAddress);
		this.vibeAgent.clearWalletMemory(walletAddress);
	}
}

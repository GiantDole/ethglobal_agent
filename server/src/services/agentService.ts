import { KnowledgeAgent } from "../../agent/src/agents/knowledge/KnowledgeAgent";
import { VibeAgent } from "../../agent/src/agents/vibe/VibeAgent";

export class AgentService {
	private knowledgeAgent: KnowledgeAgent;
	private vibeAgent: VibeAgent;

	constructor() {
		this.knowledgeAgent = new KnowledgeAgent();
		this.vibeAgent = new VibeAgent();
	}

	async evaluateResponse(
		walletAddress: string,
		question: string,
		answer: string
	) {
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

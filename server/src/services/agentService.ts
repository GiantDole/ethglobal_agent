import { KnowledgeAgent } from "../agents/knowledge/KnowledgeAgent";
import { VibeAgent } from "../agents/vibe/VibeAgent";
import { ConversationState } from "../types/conversation";

export class AgentService {
	private knowledgeAgent: KnowledgeAgent;
	private vibeAgent: VibeAgent;

	constructor() {
		this.knowledgeAgent = new KnowledgeAgent();
		this.vibeAgent = new VibeAgent();
	}

	async evaluateResponse(
		answer: string,
		conversationState: ConversationState
	) {
		const conversationHistory = conversationState.history;

		try {
			const [knowledgeEval, vibeEval] = await Promise.all([
				this.knowledgeAgent.evaluateAnswer(conversationHistory, answer),
				this.vibeAgent.evaluateAnswer(conversationHistory, answer),
			]);
			console.log(knowledgeEval, vibeEval);

			const nextQuestion = knowledgeEval.score > vibeEval.score
				? vibeEval.nextQuestion
				: knowledgeEval.nextQuestion;

			conversationHistory.push({
				question: nextQuestion,
				answer: null
			});

			conversationState.history = conversationHistory;

			return {
				nextMessage: nextQuestion,
				shouldContinue: knowledgeEval.score >= 1 && vibeEval.score >= 1,
				decision:
					!knowledgeEval.nextQuestion || !vibeEval.nextQuestion
						? "complete"
						: "pending",
				conversationState
			};
		} catch (error) {
			console.error("Error in agent evaluation:", error);
			throw error;
		}
	}

}

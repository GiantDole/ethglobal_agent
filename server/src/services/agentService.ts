import { KnowledgeAgent } from "../agents/knowledge/KnowledgeAgent";
import { VibeAgent } from "../agents/vibe/VibeAgent";
import redis from "../database/redis";
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
			const questionNumber = conversationHistory.length;
			const [knowledgeEval, vibeEval] = await Promise.all([
				this.knowledgeAgent.evaluateAnswer(conversationHistory, answer),
				this.vibeAgent.evaluateAnswer(conversationHistory, answer),
			]);

			const knowledgeScore = knowledgeEval.score;
			const vibeScore = vibeEval.score;
			const knowledgeFeedback = knowledgeEval.feedback;
			const vibeFeedback = vibeEval.feedback;

			console.log(knowledgeEval, vibeEval);

			// **Check if the user has passed the evaluation**
			const passed = knowledgeScore >= 6 && vibeScore >= 7;

			// **Determine if the user should continue based on question number**
			let shouldContinue = false;
			if (questionNumber < 3) {
				shouldContinue = true; // Always continue before question 3
			} else if (questionNumber === 3) {
				shouldContinue = knowledgeScore >= 4 && vibeScore >= 5;
			} else if (questionNumber === 4) {
				shouldContinue = knowledgeScore >= 5 && vibeScore >= 6;
			} else if (questionNumber === 5) {
				shouldContinue = false; // Must pass (score >= 8), otherwise fail
			}

			// **Immediate failure condition**
			if (knowledgeScore <= 1 || vibeScore <= 1) {
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeFeedback,
					vibeFeedback: vibeFeedback,
					shouldContinue: false,
					conversationState: conversationState
				};
			}

			// After evaluation, add both the last answer and the next question
			if (conversationHistory.length > 0) {
				// Add the answer to the last question
				conversationHistory[conversationHistory.length - 1].answer = answer;
			}

			// Only add next question if continuing
			if (shouldContinue && !passed) {
				const nextQuestion = knowledgeEval.score > vibeEval.score
					? vibeEval.nextQuestion
					: knowledgeEval.nextQuestion;
				
				conversationHistory.push({
					question: nextQuestion,
					answer: null
				});
			}

			conversationState.history = conversationHistory;

			// **Handle failure case**
			if (!shouldContinue && !passed) {
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeFeedback,
					vibeFeedback: vibeFeedback,
					conversationState: conversationState
				};
			}

			return {
				nextMessage: passed ? null : knowledgeEval.score > vibeEval.score
					? vibeEval.nextQuestion
					: knowledgeEval.nextQuestion,
				decision: passed ? "complete" : "pending",
				knowledgeFeedback: knowledgeFeedback,
				vibeFeedback: vibeFeedback,
				shouldContinue,
				conversationState: conversationState
			};
		} catch (error) {
			console.error("Error in agent evaluation:", error);
			throw error;
		}
	}

}

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
			const questionNumber = conversationHistory.length + 1;
			const [knowledgeEval, vibeEval] = await Promise.all([
				this.knowledgeAgent.evaluateAnswer(conversationHistory, answer),
				this.vibeAgent.evaluateAnswer(conversationHistory, answer),
			]);

			const knowledgeScore = knowledgeEval.score;
			const vibeScore = vibeEval.score;
			const knowledgeFeedback = knowledgeEval.feedback;
			const vibeFeedback = vibeEval.feedback;

			console.log(knowledgeEval, vibeEval);

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

			const nextQuestion = knowledgeEval.score > vibeEval.score
				? vibeEval.nextQuestion
				: knowledgeEval.nextQuestion;

			conversationHistory.push({
				question: nextQuestion,
				answer: null
			});

			conversationState.history = conversationHistory;
			/*
			return {
				nextMessage: nextQuestion,
				shouldContinue: knowledgeEval.score >= 1 && vibeEval.score >= 1,
				decision:
					!knowledgeEval.nextQuestion || !vibeEval.nextQuestion
						? "complete"
						: "pending",
				conversationState
			const knowledgeScore = knowledgeEval.score;
			const vibeScore = vibeEval.score;
			const knowledgeFeedback = knowledgeEval.feedback;
			const vibeFeedback = vibeEval.feedback;
			*/


			// **Check if the user has passed the evaluation**
			const passed = knowledgeScore >= 6 && vibeScore >= 7;

			let shouldContinue = false;

			// **Determine if the user should continue based on question number**
			if (questionNumber < 3) {
				shouldContinue = true; // Always continue before question 3
			} else if (questionNumber === 3) {
				shouldContinue = knowledgeScore >= 4 && vibeScore >= 5;
			} else if (questionNumber === 4) {
				shouldContinue = knowledgeScore >= 5 && vibeScore >= 6;
			} else if (questionNumber === 5) {
				shouldContinue = false; // Must pass (score >= 8), otherwise fail
			}

			// **Update progress in Redis**
			if (shouldContinue || passed) {
			} else {
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeFeedback,
					vibeFeedback: vibeFeedback,
					conversationState: conversationState
				};
			}

			return {
				nextQuestion: passed
					? null // If passed, do not send next question
					: knowledgeEval.score > vibeEval.score
					? vibeEval.nextQuestion
					: knowledgeEval.nextQuestion,
				decision: passed ? "complete" : "pending",
				knowledgeFeedback: knowledgeFeedback,
				vibeFeedback: vibeFeedback,
				conversationState: conversationState
			};
		} catch (error) {
			console.error("Error in agent evaluation:", error);
			throw error;
		}
	}

}

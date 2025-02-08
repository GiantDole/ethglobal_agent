import { KnowledgeAgent } from "../agents/knowledge/KnowledgeAgent";
import { VibeAgent } from "../agents/vibe/VibeAgent";
import { ConversationState } from "../types/conversation";
import logger from "../config/logger";

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
		logger.info({ questionNumber: conversationHistory.length, answer }, 'Starting evaluation');

		try {
			const questionNumber = conversationHistory.length;
			logger.info({ questionNumber }, 'Running evaluations');
			
			const [knowledgeEval, vibeEval] = await Promise.all([
				this.knowledgeAgent.evaluateAnswer(conversationHistory, answer),
				this.vibeAgent.evaluateAnswer(conversationHistory, answer),
			]);

			const knowledgeScore = knowledgeEval.score;
			const vibeScore = vibeEval.score;
			logger.info({ knowledgeScore, vibeScore }, 'Scores received');

			// **Check if the user has passed the evaluation**
			const passed = knowledgeScore >= 6 && vibeScore >= 7;
			logger.info({ passed, questionNumber }, 'Pass status');

			// **Determine if the user should continue**
			let shouldContinue = false;
			if (questionNumber < 3) {
				shouldContinue = true;
			} else if (questionNumber === 3) {
				shouldContinue = knowledgeScore >= 4 && vibeScore >= 5;
			} else if (questionNumber === 4) {
				shouldContinue = knowledgeScore >= 5 && vibeScore >= 6;
			} else if (questionNumber === 5) {
				shouldContinue = false;
			}
			logger.info({ shouldContinue, questionNumber }, 'Continue status');

			// **Immediate failure condition**
			if (knowledgeScore <= 1 || vibeScore <= 1) {
				logger.info({ knowledgeScore, vibeScore }, 'Immediate failure triggered');
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeEval.feedback,
					vibeFeedback: vibeEval.feedback,
					shouldContinue: false,
					conversationState: conversationState
				};
			}

			if (conversationHistory.length > 0) {
				logger.info({ answer, historyLength: conversationHistory.length }, 'Adding answer to history');
				conversationHistory[conversationHistory.length - 1].answer = answer;
			}

			// Only add next question if continuing
			if (shouldContinue && !passed) {
				const nextQuestion = knowledgeEval.score > vibeEval.score
					? vibeEval.nextQuestion
					: knowledgeEval.nextQuestion;
				
				logger.info({ nextQuestion }, 'Adding next question');
				conversationHistory.push({
					question: nextQuestion,
					answer: null
				});
			}
			logger.info({conversationHistory}, 'Conversation history after evaluation.');

			conversationState.history = conversationHistory;

			// **Handle failure case**
			if (!shouldContinue && !passed) {
				logger.info('Evaluation failed', { shouldContinue, passed });
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeEval.feedback,
					vibeFeedback: vibeEval.feedback,
					shouldContinue: false,
					conversationState: conversationState
				};
			}

			const result = {
				nextMessage: passed ? null : knowledgeEval.score > vibeEval.score
					? vibeEval.nextQuestion
					: knowledgeEval.nextQuestion,
				decision: passed ? "complete" : "pending",
				knowledgeFeedback: knowledgeEval.feedback,
				vibeFeedback: vibeEval.feedback,
				shouldContinue,
				conversationState: conversationState
			};
			logger.info({ decision: result.decision, nextMessage: result.nextMessage }, 'Evaluation complete');
			return result;

		} catch (error) {
			logger.error('Error in agent evaluation:', error);
			throw error;
		}
	}

}

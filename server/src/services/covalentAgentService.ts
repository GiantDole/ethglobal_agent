import { ConversationState } from "../types/conversation";
import logger from "../config/logger";
import { KnowledgeQuestionGeneratorAgent } from "../agents/covalentAgents/Knowledge/knowledgeQuestionGeneratorAgent";
import { KnowledgeScoreAgent } from "../agents/covalentAgents/Knowledge/knowledgeScoreAgent";
import { VibeQuestionGeneratorAgent } from "../agents/covalentAgents/Vibe/vibeQuestionGeneratorAgent";
import { VibeScoreAgent } from "../agents/covalentAgents/Vibe/vibeScoreAgent";
import { getBouncerConfig } from "./bouncerService";

export class CovalentAgentService {
	private knowledgeScoreAgent: KnowledgeScoreAgent;
	private knowledgeQuestionAgent: KnowledgeQuestionGeneratorAgent;
	private vibeScoreAgent: VibeScoreAgent;
	private vibeQuestionAgent: VibeQuestionGeneratorAgent;

	constructor() {
		this.knowledgeScoreAgent = new KnowledgeScoreAgent();
		this.knowledgeQuestionAgent = new KnowledgeQuestionGeneratorAgent();
		this.vibeScoreAgent = new VibeScoreAgent();
		this.vibeQuestionAgent = new VibeQuestionGeneratorAgent();
	}

	async evaluateResponse(
		answer: string,
		conversationState: ConversationState,
		projectId: string
	) {
		try {
			const bouncerConfig = await getBouncerConfig(projectId);

			// Set configs for all agents
			this.knowledgeScoreAgent.setBouncerConfig(bouncerConfig);
			this.knowledgeQuestionAgent.setBouncerConfig(bouncerConfig);

			const conversationHistory = [...conversationState.history];
			const questionNumber = conversationHistory.length;

			logger.info(
				{ questionNumber, answer, historyLength: conversationHistory.length },
				"Starting evaluation"
			);

			// Handle first question case
			if (questionNumber === 0) {
				const firstQuestion =
					await this.knowledgeQuestionAgent.generateNextQuestion([]);
				logger.info({ firstQuestion }, "Generated first question");

				return {
					nextMessage: firstQuestion,
					decision: "pending",
					shouldContinue: true,
					conversationState: {
						...conversationState,
						history: [
							{
								question: firstQuestion,
								answer: null,
							},
						],
					},
				};
			}

			// Update the last question's answer
			const lastEntry = conversationHistory[questionNumber - 1];
			if (!lastEntry.answer && lastEntry.question) {
				lastEntry.answer = answer;
			}

			// Format history for agents (only completed Q&A pairs)
			const formattedHistory = conversationHistory
				.filter((entry) => entry.question && entry.answer)
				.map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`);

			// Get current question
			const currentQuestion = lastEntry.question;

			// Get scores from both agents
			const [knowledgeScore, vibeScore] = await Promise.all([
				this.knowledgeScoreAgent.evaluateKnowledge(
					currentQuestion,
					answer,
					formattedHistory
				),
				this.vibeScoreAgent.evaluateKnowledge(
					currentQuestion,
					answer,
					formattedHistory
				),
			]);

			logger.info({ knowledgeScore, vibeScore }, "LLM evaluations complete.");

			// Check for immediate failure
			if (knowledgeScore <= 1 || vibeScore <= 1) {
				logger.info(
					{ knowledgeScore, vibeScore },
					"Immediate failure triggered"
				);
				return {
					nextMessage: null,
					decision: "failed",
					shouldContinue: false,
					conversationState: {
						...conversationState,
						history: conversationHistory,
					},
				};
			}

			// Determine pass/continue status based on question number and scores
			let passed = false;
			let shouldContinue = true;

			if (questionNumber >= 5) {
				shouldContinue = false;
				passed = knowledgeScore >= 6 && vibeScore >= 6;
			} else if (questionNumber >= 3) {
				passed = knowledgeScore >= 5 && vibeScore >= 5;
				shouldContinue = !passed;
			} else {
				passed = knowledgeScore >= 4 && vibeScore >= 4;
				shouldContinue = !passed;
			}

			logger.info(
				{
					passed,
					shouldContinue,
					questionNumber,
					historyLength: conversationHistory.length,
				},
				"Evaluation status"
			);

			// Generate next question if continuing
			let nextQuestion = null;
			if (shouldContinue) {
				nextQuestion = await (knowledgeScore > vibeScore
					? this.vibeQuestionAgent.generateNextQuestion(formattedHistory)
					: this.knowledgeQuestionAgent.generateNextQuestion(formattedHistory));

				logger.info({ nextQuestion }, "Generated next question");

				if (nextQuestion) {
					conversationHistory.push({
						question: nextQuestion,
						answer: null,
					});
				}
			}

			const decision = passed
				? "complete"
				: shouldContinue
				? "pending"
				: "failed";

			logger.info(
				{
					decision,
					historyLength: conversationHistory.length,
					lastAnswer: conversationHistory[questionNumber - 1]?.answer,
					nextQuestion,
				},
				"Final state"
			);

			return {
				nextMessage: nextQuestion,
				decision,
				shouldContinue,
				conversationState: {
					...conversationState,
					history: conversationHistory,
				},
			};
		} catch (error) {
			logger.error("Error in agent evaluation:", error);
			throw error;
		}
	}
}

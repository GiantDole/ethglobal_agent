import { ConversationState } from "../types/conversation";
import logger from "../config/logger";
import { KnowledgeQuestionGeneratorAgent } from "../agents/covalentAgents/Knowledge/knowledgeQuestionGeneratorAgent";
import { KnowledgeScoreAgent } from "../agents/covalentAgents/Knowledge/knowledgeScoreAgent";
import { VibeQuestionGeneratorAgent } from "../agents/covalentAgents/Vibe/vibeQuestionGeneratorAgent";
import { VibeScoreAgent } from "../agents/covalentAgents/Vibe/vibeScoreAgent";
import { OnChainScoreAgent } from "../agents/covalentAgents/WalletHistory/onChainScoreAgent";
import { getBouncerConfig } from "./bouncerService";
import { QuestionGeneratorAgent } from "../agents/covalentAgents/Question/QuestionGenerator";

export class CovalentAgentService {
	private knowledgeScoreAgent: KnowledgeScoreAgent;
	private knowledgeQuestionAgent: KnowledgeQuestionGeneratorAgent;
	private vibeScoreAgent: VibeScoreAgent;
	private vibeQuestionAgent: VibeQuestionGeneratorAgent;
	private questionGeneratorAgent: QuestionGeneratorAgent;
	private onChainScoreAgent: OnChainScoreAgent;
	private walletBonus: Map<string, number>;

	constructor() {
		this.knowledgeScoreAgent = new KnowledgeScoreAgent();
		this.knowledgeQuestionAgent = new KnowledgeQuestionGeneratorAgent();
		this.vibeScoreAgent = new VibeScoreAgent();
		this.vibeQuestionAgent = new VibeQuestionGeneratorAgent();
		this.questionGeneratorAgent = new QuestionGeneratorAgent();
		this.onChainScoreAgent = new OnChainScoreAgent(
			process.env.GOLDRUSH_API_KEY!
		);
		this.walletBonus = new Map();
	}

	async evaluateResponse(
		answer: string,
		conversationState: ConversationState,
		projectId: string,
		walletAddress?: string
	) {
		try {
			const bouncerConfig = await getBouncerConfig(projectId);
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
				// Get on-chain score if wallet address is provided
				if (walletAddress) {
					try {
						const onChainScore =
							await this.onChainScoreAgent.evaluateOnChainActivity(
								walletAddress
							);
						this.walletBonus.set(walletAddress, onChainScore);
						logger.info(
							{ walletAddress, onChainScore },
							"On-chain score calculated"
						);
					} catch (error) {
						logger.error(
							{ error, walletAddress },
							"Error getting on-chain score"
						);
						this.walletBonus.set(walletAddress, 0);
					}
				}

				const firstQuestion =
					await this.knowledgeQuestionAgent.generateNextQuestion([]);
				logger.info({ firstQuestion }, "Generated first question");

				const modifiedFirstQuestion =
					await this.questionGeneratorAgent.modifyQuestionTone(
						firstQuestion,
						bouncerConfig.character_choice
					);

				logger.info(
					{ modifiedFirstQuestion },
					"Modified first question based on character tone"
				);

				return {
					nextMessage: modifiedFirstQuestion,
					decision: "pending",
					shouldContinue: true,
					conversationState: {
						...conversationState,
						history: [
							{
								question: modifiedFirstQuestion,
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

			// Format history for agents (excluding current Q&A)
			const formattedHistory = conversationHistory
				.slice(0, -1) // Exclude current Q&A
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

			// Add wallet bonus if exists
			const bonus = walletAddress
				? this.walletBonus.get(walletAddress) || 0
				: 0;
			const adjustedKnowledgeScore = Math.min(10, knowledgeScore + bonus * 0.2);
			const adjustedVibeScore = Math.min(10, vibeScore + bonus * 0.2);

			logger.info(
				{
					knowledgeScore,
					vibeScore,
					bonus,
					adjustedKnowledgeScore,
					adjustedVibeScore,
				},
				"Scores calculated"
			);

			// Rest of the evaluation logic using adjustedKnowledgeScore and adjustedVibeScore
			if (adjustedKnowledgeScore <= 1 || adjustedVibeScore <= 1) {
				logger.info(
					{ adjustedKnowledgeScore, adjustedVibeScore },
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

			let passed = false;
			let shouldContinue = true;

			if (questionNumber >= 5) {
				shouldContinue = false;
				passed = adjustedKnowledgeScore >= 6 && adjustedVibeScore >= 6;
			} else if (questionNumber >= 3) {
				passed = adjustedKnowledgeScore >= 5 && adjustedVibeScore >= 5;
				shouldContinue = !passed;
			} else {
				passed = adjustedKnowledgeScore >= 4 && adjustedVibeScore >= 4;
				shouldContinue = !passed;
			}

			// Generate next question if continuing
			let nextQuestion = null;
			if (shouldContinue) {
				const tempNextQuestion = await (adjustedKnowledgeScore >
				adjustedVibeScore
					? this.vibeQuestionAgent.generateNextQuestion(formattedHistory)
					: this.knowledgeQuestionAgent.generateNextQuestion(formattedHistory));

				nextQuestion = await this.questionGeneratorAgent.modifyQuestionTone(
					tempNextQuestion,
					bouncerConfig.character_choice
				);

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

import { KnowledgeAgent } from "../agents/notUsedAgents/knowledge/KnowledgeAgent";
import { VibeAgent } from "../agents/notUsedAgents/vibe/VibeAgent";
import { ConversationState } from "../types/conversation";
import logger from "../config/logger";
import { getBouncerConfig } from "./bouncerService";
import { ToneAgent } from "../agents/notUsedAgents/tone/ToneAgent";

export class AgentService {
	private knowledgeAgent: KnowledgeAgent;
	private vibeAgent: VibeAgent;
	private toneAgent: ToneAgent;

	constructor() {
		this.knowledgeAgent = new KnowledgeAgent();
		this.vibeAgent = new VibeAgent();
		this.toneAgent = new ToneAgent();
	}

	async evaluateResponse(
		answer: string,
		conversationState: ConversationState,
		projectId: string
	) {
		const conversationHistory = conversationState.history;
		logger.info(
			{ questionNumber: conversationHistory.length, answer },
			"Starting evaluation"
		);

		try {
			const SECRET_PROMPT = process.env.SECRET_PROMPT!;
			logger.info({ SECRET_PROMPT, answer }, "Checking for secret prompt");
			if (answer.toLowerCase().includes(SECRET_PROMPT.toLowerCase())) {
				logger.info("Secret prompt detected");
				return {
					nextMessage: null,
					decision: "complete",
					shouldContinue: false,
					conversationState: {
						...conversationState,
					},
					knowledgeScore: 10,
					vibeScore: 10,
				};
			}
			const bouncerConfig = await getBouncerConfig(projectId);
			this.knowledgeAgent.setBouncerConfig(bouncerConfig);
			const questionNumber = conversationHistory.length;
			logger.info(
				{ questionNumber, conversationHistory, answer },
				"Running evaluations"
			);

			if (questionNumber === 0) {
				const firstQuestion = await this.knowledgeAgent.evaluateAnswer(
					[],
					answer
				);
				logger.info({ firstQuestion }, "Generated first question");

				const modifiedFirstQuestion = await this.toneAgent.modifyTone(
					firstQuestion.nextQuestion,
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
					knowledgeScore: 0,
					vibeScore: 0,
				};
			}

			const [knowledgeEval, vibeEval] = await Promise.all([
				this.knowledgeAgent.evaluateAnswer(conversationHistory, answer),
				this.vibeAgent.evaluateAnswer(conversationHistory, answer),
			]);

			const knowledgeScore = knowledgeEval.score;
			const vibeScore = vibeEval.score;
			logger.info({ knowledgeEval, vibeEval }, "LLM evaluations complete.");

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
					knowledgeScore: knowledgeScore,
					vibeScore: vibeScore,
				};
			}

			let passed = false;
			let shouldContinue = true;

			if (questionNumber > 5) {
				shouldContinue = false;
				passed = knowledgeScore >= 7 && vibeScore >= 8;
			} else if (questionNumber >= 3) {
				passed = knowledgeScore >= 6 && vibeScore >= 7;
				shouldContinue = !passed;
			} else if (questionNumber == 2) {
				passed = knowledgeScore >= 5 && vibeScore >= 6;
				shouldContinue = !passed;
			} else {
				passed = false;
				shouldContinue = true;
			}

			// Adding the user's answer to the last question if it exists.
			if (conversationHistory.length > 0) {
				logger.info(
					{ answer, historyLength: conversationHistory.length },
					"Adding answer to history"
				);
				conversationHistory[conversationHistory.length - 1].answer = answer;
			}

			// Only add next question if continuing.
			// Originally, the code tone-modified each candidate then picked one.
			// Now, we select the raw next question based on scores and modify it only once.
			let modifiedNextQuestion = "";
			if (shouldContinue && !passed) {
				const rawNextQuestion =
					knowledgeEval.score > vibeEval.score
						? vibeEval.nextQuestion
						: knowledgeEval.nextQuestion;
				modifiedNextQuestion = await this.toneAgent.modifyTone(
					rawNextQuestion,
					bouncerConfig.character_choice
				);
				logger.info({ nextQuestion: modifiedNextQuestion }, "Adding next question");
				conversationHistory.push({
					question: modifiedNextQuestion,
					answer: null,
				});
			}
			logger.info(
				{ conversationHistory },
				"Conversation history after evaluation."
			);

			conversationState.history = conversationHistory;

			// **Handle failure case**
			if (!shouldContinue && !passed) {
				logger.info("Evaluation failed", { shouldContinue, passed });
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeEval.feedback,
					vibeFeedback: vibeEval.feedback,
					shouldContinue: false,
					conversationState: conversationState,
					knowledgeScore: knowledgeEval.score,
					vibeScore: vibeEval.score,
				};
			}

			const decision = passed
				? "complete"
				: shouldContinue
				? "pending"
				: "failed";

			const result = {
				// Use the tone-modified next question if not passed.
				nextMessage: passed ? null : modifiedNextQuestion,
				decision,
				knowledgeFeedback: knowledgeEval.feedback,
				vibeFeedback: vibeEval.feedback,
				shouldContinue,
				conversationState: conversationState,
				knowledgeScore: knowledgeEval.score,
				vibeScore: vibeEval.score,
			};
			logger.info(
				{ decision: result.decision, nextMessage: result.nextMessage },
				"Evaluation complete"
			);
			return result;
		} catch (error) {
			logger.error("Error in agent evaluation:", error);
			throw error;
		}
	}
}

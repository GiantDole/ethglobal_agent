import { KnowledgeAgent } from "../agents/knowledge/KnowledgeAgent";
import { VibeAgent } from "../agents/vibe/VibeAgent";
import redis from "../database/redis";

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
			const userData = await redis.get(`user:${walletAddress}`);
			let userProgress = userData
				? JSON.parse(userData)
				: { questionNumber: 1, history: [] };

			const questionNumber = userProgress.questionNumber;
			const [knowledgeEval, vibeEval] = await Promise.all([
				this.knowledgeAgent.evaluateAnswer(walletAddress, question, answer),
				this.vibeAgent.evaluateAnswer(walletAddress, question, answer),
			]);

			console.log(knowledgeEval, vibeEval);

			const knowledgeScore = knowledgeEval.score;
			const vibeScore = vibeEval.score;
			const knowledgeFeedback = knowledgeEval.feedback;
			const vibeFeedback = vibeEval.feedback;

			// **Immediate failure condition**
			if (knowledgeScore <= 1 || vibeScore <= 1) {
				await redis.del(`user:${walletAddress}`);
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeFeedback,
					vibeFeedback: vibeFeedback,
				};
			}

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
				userProgress.questionNumber += 1;
			} else {
				await redis.del(`user:${walletAddress}`);
				return {
					nextMessage: null,
					decision: "failed",
					knowledgeFeedback: knowledgeFeedback,
					vibeFeedback: vibeFeedback,
				};
			}

			// **Store question and answer history**
			userProgress.history.push({
				question,
				answer,
				knowledgeScore,
				knowledgeFeedback,
				vibeScore,
				vibeFeedback,
			});

			// **Save back to Redis with expiry**
			await redis.set(
				`user:${walletAddress}`,
				JSON.stringify(userProgress),
				"EX",
				180 * 60
			);
			return {
				nextQuestion: passed
					? null // If passed, do not send next question
					: knowledgeEval.score > vibeEval.score
					? vibeEval.nextQuestion
					: knowledgeEval.nextQuestion,
				decision: passed ? "complete" : "pending",
				knowledgeFeedback: knowledgeFeedback,
				vibeFeedback: vibeFeedback,
			};
		} catch (error) {
			console.error("Error in agent evaluation:", error);
			throw error;
		}
	}

	async getUserHistory(walletAddress: string) {
		const userData = await redis.get(`user:${walletAddress}`);
		return userData ? JSON.parse(userData) : { questionNumber: 1, history: [] };
	}

	async clearMemory(walletAddress: string) {
		this.knowledgeAgent.clearWalletMemory(walletAddress);
		this.vibeAgent.clearWalletMemory(walletAddress);
		await redis.del(`user:${walletAddress}`);
	}
}

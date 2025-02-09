import { Agent } from "@covalenthq/ai-agent-sdk";
import { StateFn } from "@covalenthq/ai-agent-sdk/dist/core/state";
import type { ChatCompletionMessage } from "openai/resources/chat/completions";

export class ScoreEvaluatorAgent {
	private agent: Agent;

	constructor() {
		this.agent = new Agent({
			name: "score-evaluator",
			model: {
				provider: "GEMINI",
				name: "gemini-1.5-flash",
			},
			description:
				"You are an expert at evaluating on-chain activity and providing engagement scores.",
			instructions: [
				"Analyze wallet token balances ",
				"Check NFT holdings and their activity",
				"Consider the age of the wallet",
				"Provide a score out of 5 based on holdings",
				"Higher scores for wallets with diverse holdings",
				"Use the engagement score already given in the summary",
				"Return a number only i.e the score from a rating(1-5)",
			],
		});
	}

	async evaluateScore(summary: string): Promise<number> {
		const state = StateFn.root(`
			Summary: ${summary}
			Provide a score (0-5) based on the engagement score of the wallet summary. Be a bit strict in checking. if a wallet has a minimum balance then a score of 1, if it has too much interaction then a score of 3 to 4 and so on.
		`);

		try {
			const result = await this.agent.run(state);
			const lastMessage = result.messages[
				result.messages.length - 1
			] as ChatCompletionMessage;

			if (!lastMessage || typeof lastMessage.content !== "string") {
				throw new Error("Invalid response from agent");
			}

			const evaluation = JSON.parse(lastMessage.content);
			return evaluation;
		} catch (error) {
			console.error("Error in knowledge evaluation:", error);
			throw error;
		}
	}
}

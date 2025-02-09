import { Agent, runToolCalls } from "@covalenthq/ai-agent-sdk";
import { StateFn } from "@covalenthq/ai-agent-sdk/dist/core/state";
import {
	TokenBalancesTool,
	NFTBalancesTool,
	TransactionsTool,
} from "@covalenthq/ai-agent-sdk";
import type {
	ChatCompletionAssistantMessageParam,
	ChatCompletionMessage,
} from "openai/resources/chat/completions";
import { user } from "@covalenthq/ai-agent-sdk/dist/core/base";
import { ScoreEvaluatorAgent } from "./scoreEvaluatorAgent";

export class OnChainScoreAgent {
	private agent: Agent;
	private tools: any;
	private scoreEvaluatorAgent: ScoreEvaluatorAgent;

	constructor(apiKey: string) {
		this.tools = {
			tokenBalances: new TokenBalancesTool(apiKey),
			nftBalances: new NFTBalancesTool(apiKey),
			// transactions: new TransactionsTool(apiKey),
		};
		const tools = this.tools;

		this.agent = new Agent({
			name: "on-chain-evaluator",
			model: {
				provider: "OPEN_AI",
				name: "gpt-4o-mini",
			},
			description:
				"You are an expert at evaluating on-chain activity and providing engagement scores.",
			instructions: [
				"Analyze wallet activities using the provided blockchain tools",
				"Summarize token holdings, NFT collections",
				"Provide insights about the wallet's activity patterns",
			],
			tools,
		});

		this.scoreEvaluatorAgent = new ScoreEvaluatorAgent();
	}

	async evaluateOnChainActivity(walletAddress: string): Promise<number> {
		const state = StateFn.root(this.agent.description);
		state.messages.push(
			user(
				`Analyze the on-chain activity for wallet ${walletAddress} and provide a score out of 5.
			Consider:
			1. Token balances and their values
			2. NFT holdings and activity

			Return a summary`
			)
		);

		try {
			const result = await this.agent.run(state);
			console.log(result);
			const toolCall = result.messages[
				result.messages.length - 1
			] as ChatCompletionAssistantMessageParam;

			const toolResponses = await runToolCalls(
				this.tools,
				toolCall?.tool_calls ?? []
			);

			const updatedState = {
				...result,
				status: "running" as const,
				messages: [...result.messages, ...toolResponses],
			};

			const finalResult = await this.agent.run(updatedState);

			console.log(
				"Final analysis:",
				finalResult.messages[finalResult.messages.length - 1]?.content
			);

			const lastMessage = result.messages[
				result.messages.length - 1
			] as ChatCompletionMessage;

			if (!lastMessage || typeof lastMessage.content !== "string") {
				throw new Error("Invalid response from agent");
			}
			const score = await this.scoreEvaluatorAgent.evaluateScore(
				lastMessage.content
			);
			console.log("Score based on wallet activity : ", score);
			return Math.min(5, score);
		} catch (error) {
			console.error("Error in on-chain evaluation:", error);
			throw error;
		}
	}
}

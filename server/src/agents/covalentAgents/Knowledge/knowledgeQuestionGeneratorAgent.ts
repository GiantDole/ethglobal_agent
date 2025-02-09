import { Agent } from "@covalenthq/ai-agent-sdk";
import { StateFn } from "@covalenthq/ai-agent-sdk/dist/core/state";
import type { ChatCompletionMessage } from "openai/resources/chat/completions";
import { BouncerConfig } from "../../../types/bouncer";

export class KnowledgeQuestionGeneratorAgent {
	private agent: Agent;
	private bouncerConfig?: BouncerConfig;

	constructor() {
		this.agent = new Agent({
			name: "question-generator",
			model: {
				provider: "GEMINI",
				name: "gemini-1.5-flash",
			},
			description:
				"You are an expert at generating contextual questions about memecoin and web3 culture.",

			instructions: [
				"Generate questions that test understanding of memecoin culture and specific token knowledge",
				"Questions should progress in difficulty and expose contradictions",
				"Keep questions concise and focused",
				"Avoid mainstream meme references",
				"Insert subtle authenticity checks",
			],
		});
	}

	setBouncerConfig(config: BouncerConfig) {
		this.bouncerConfig = config;
	}

	async generateNextQuestion(history: string[]): Promise<string> {
		if (!this.bouncerConfig) {
			throw new Error("Bouncer config not set");
		}

		const { mandatory_knowledge, whitepaper_knowledge, project_desc } =
			this.bouncerConfig;

		let state: any;
		if (history.length > 0) {
			state = StateFn.root(`
				Required knowledge to test:
				${mandatory_knowledge}

				Follow these instructions :
				${whitepaper_knowledge}

				Project Description: 
				${project_desc}

				Previous conversation:
				${history.join("\n")}
				
				Generate a single follow-up question that:
				1. Tests understanding of the mandatory knowledge
				2. Follows the whitepaper instructions
				3. Probes deeper based on previous answers
				4. Don't reveal details about the project, just ask the question
			`);
		} else {
			state = StateFn.root(`
				Required knowledge to test:
				${mandatory_knowledge}

				Use this whitepaper knowledge for reference :
				${whitepaper_knowledge}

				Project Description: 
				${project_desc}
				
				Generate an initial question that:
				1. Tests basic understanding of the mandatory knowledge
				2. Follows the whitepaper instructions
				3. Don't reveal details about the project, just ask the question
			`);
		}

		try {
			const result = await this.agent.run(state);
			console.log(result);
			const lastMessage = result.messages.find(
				(msg) => msg.role === "assistant"
			) as ChatCompletionMessage;

			if (!lastMessage || typeof lastMessage.content !== "string") {
				throw new Error("Invalid response from agent");
			}

			return lastMessage.content.trim();
		} catch (error) {
			console.error("Error generating question:", error);
			throw error;
		}
	}
}

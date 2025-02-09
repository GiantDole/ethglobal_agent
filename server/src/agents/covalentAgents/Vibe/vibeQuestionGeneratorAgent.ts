import { Agent } from "@covalenthq/ai-agent-sdk";
import { StateFn } from "@covalenthq/ai-agent-sdk/dist/core/state";
import type { ChatCompletionMessage } from "openai/resources/chat/completions";

export class VibeQuestionGeneratorAgent {
	private agent: Agent;

	constructor() {
		this.agent = new Agent({
			name: "question-generator",
			model: {
				provider: "GEMINI",
				name: "gemini-1.5-flash",
			},
			description:
				"You are an expert at generating esoteric, vibe-checking questions that test alignment with memecoin and web3 culture.",

			instructions: [
				"Generate a short, cryptic, or absurd question that determines whether the user truly understands the vibe of memecoin culture.",
				"Do **not** focus purely on knowledge—test the user's instinct, creativity, and chaotic energy.",
				"Use humor, irony, or deep-cut references to challenge the user's authenticity.",
				"If the user is too serious, hit them with something ridiculous but meaningful within the culture.",
				"If the user is too predictable, disrupt their expectations with something unexpected.",
				"Give lower scores for predictable or surface-level meme references (Doge, Pepe, Shiba Inu).",
				"Questions should be deadpan, skeptical, and subtly challenge the user’s legitimacy.",
				"Never explicitly tell the user what is being tested—let them wonder.",
				"Adjust the tone based on any specific token instructions provided by the token owner.",
				"Return a single question string as the next challenge.",
			],
		});
	}

	async generateNextQuestion(history: string[]): Promise<string> {
		const state = StateFn.root(`
			You are generating a **vibe-checking** question to test the user's memecoin alignment.

			Previous conversation history:
			${history.join("\n")}

			**Rules:**
			- Do NOT directly test knowledge; test intuition, humor, and the ability to embrace absurdity.
			- If they are too mainstream, push them toward deeper meme culture.
			- If they try too hard, subtly call them out.
			- If they lack chaos, introduce uncertainty.
			- Generate a single, concise question that carries the right **tone** (cryptic, skeptical, and absurd).

			Return only the next question.
		`);

		console.log(state);

		try {
			const result = await this.agent.run(state);
			const lastMessage = result.messages.find(
				(msg) => msg.role === "assistant"
			) as ChatCompletionMessage;

			if (!lastMessage || typeof lastMessage.content !== "string") {
				throw new Error(
					"Invalid response from agent - No valid question generated."
				);
			}

			return lastMessage.content.trim();
		} catch (error) {
			console.error("Error generating vibe-check question:", error);
			throw error;
		}
	}
}

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
				"You are an expert at generating contextual questions about memecoin and web3 culture.",

			instructions: [
				"Generate a short, cryptic question that tests the user’s alignment with memecoin culture and the specific token’s ethos.",
				"Take previous questions and answers into account to make the challenge more difficult or expose contradictions.",
				"Questions should be deadpan, skeptical, and slightly absurd—mirroring the Berlin bouncer personality.",
				"If the user lacks creativity or humor, force them into an unpredictable or chaotic situation.",
				"If they are overly serious, challenge them with something ridiculous but meaningful within memecoin culture.",
				"Give low scores for mainstream meme references (Doge, Pepe, Shiba Inu).",
				"Subtly test for authenticity—do not reveal what is being evaluated.",
				"Adjust the nature of questions based on additional token-specific instructions provided by the token owner.",
				"Return a string i.e. the next question",
			],
		});
	}

	async generateNextQuestion(history: string[]): Promise<string> {
		const state = StateFn.root(`
			Based on the following conversation history, generate the next question:
			${history.join("\n")}
			
			Generate a single follow-up question that probes deeper into the user's knowledge.
		`);

		try {
			const result = await this.agent.run(state);
			const lastMessage = result.messages[
				result.messages.length - 1
			] as ChatCompletionMessage;

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

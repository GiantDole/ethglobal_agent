import { Agent } from "@covalenthq/ai-agent-sdk";
import { StateFn } from "@covalenthq/ai-agent-sdk/dist/core/state";
import type { ChatCompletionMessage } from "openai/resources/chat/completions";

export class QuestionGeneratorAgent {
	private agent: Agent;

	constructor() {
		this.agent = new Agent({
			name: "tone-modifier",
			model: {
				provider: "GEMINI",
				name: "gemini-1.5-flash",
			},
			description:
				"You modify the tone of a given question while preserving its original meaning.",
			instructions: [
				"Adjust the tone of the given question according to the specified tone description.",
				"Ensure the core intent and meaning of the question remain intact.",
				"Modify language, phrasing, and style to fit the specified tone.",
				"Do not introduce or remove key concepts from the original question.",
			],
		});
	}

	async modifyQuestionTone(
		question: string,
		character_tone: string
	): Promise<string> {
		const state = StateFn.root(`
			Modify the following question to match the specified tone:

			Question: "${question}"
			Desired Tone: "${character_tone}"

			Instructions:
			1. Adjust the phrasing and language to align with the given tone.
			2. Maintain the original intent, ensuring the core meaning stays the same.
			3. Do not remove or add new concepts beyond tone adjustments.
			4. Respond with only the modified question, no explanations.

			Provide the modified question as a single string.
		`);

		try {
			const result = await this.agent.run(state);
			const assistantMessage = result.messages.find(
				(msg) => msg.role === "assistant"
			) as ChatCompletionMessage;

			if (!assistantMessage || typeof assistantMessage.content !== "string") {
				throw new Error("Invalid response from agent");
			}

			return assistantMessage.content.trim();
		} catch (error) {
			console.error("Error modifying question tone:", error);
			throw error;
		}
	}
}

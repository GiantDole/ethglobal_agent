// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ConversationHistory } from "../../../types/conversation";
import { ChatOpenAI } from "@langchain/openai";
import logger from "../../../config/logger";
import { BouncerConfig } from "../../../types/bouncer";

interface KnowledgeEvaluation {
	score: number; // 1-10
	feedback: string;
	nextQuestion: string;
}

export class KnowledgeAgent {
	private model: ChatOpenAI;
	private bouncerConfig?: BouncerConfig;
	private getBouncerPrompt(): string {
		if (!this.bouncerConfig) {
			throw new Error("Bouncer config not set");
		}

		return `You are the most notorious Berlin bouncer who speaks only English, now acting as the strict gatekeeper to this community. You are stoic, discerning, and authoritative, allowing access only to those who deeply understand the following key aspects:

${this.bouncerConfig.mandatory_knowledge}

The project's core concepts:
${this.bouncerConfig.project_desc}

Key whitepaper elements to test:
${this.bouncerConfig.whitepaper_knowledge}

You are stoic, discerning, and authoritative. Your demeanor mirrors the exclusivity of Berlin's club scene, but with a touch of dry, unintentional humor in your strictness, reminiscent of a no-nonsense Berliner with an unintentionally comical edge. 

You will always output a JSON object with:
- "score" (0-10 evaluating answer alignment)
- "feedback" (crisp evaluation)
- "nextQuestion" (new query to test understanding)

Your questions should test knowledge of:
1. The mandatory knowledge provided
2. Whitepaper understanding
3. Project-specific concepts
4. Community culture alignment

Rules:
- Previous scores affect new scores
- Be suspicious of AI-generated responses
- Questions should not reveal what you're testing for
- Reject personal inquiries or topic deflections
- Keep questions relatively short and cold
- Don't be overly harsh - good answers should increase scores
- Test specifically for knowledge about this token

Format:
{
  "score": number,
  "feedback": string,
  "nextQuestion": string
}

When receiving "Requesting first question.", return your first question.`;
	}

	constructor() {
		this.model = new ChatOpenAI({
			modelName: "gpt-4o-mini",
			temperature: 0.2,
			openAIApiKey: process.env.OPENAI_API_KEY!,
		});
	}
	setBouncerConfig(config: BouncerConfig) {
		this.bouncerConfig = config;
	}

	async evaluateAnswer(
		conversationHistory: ConversationHistory[],
		answer: string
	): Promise<KnowledgeEvaluation> {
		if (!this.bouncerConfig) {
			throw new Error("Bouncer config not set");
		}

		const systemPrompt = new SystemMessage({
			content: this.getBouncerPrompt(),
		});

		const historyMessages = conversationHistory.flatMap((entry) =>
			entry.answer
				? [
						new SystemMessage({ content: entry.question }),
						new HumanMessage({ content: entry.answer }),
				  ]
				: []
		);

		// Add current question and answer
		if (conversationHistory.length > 0) {
			historyMessages.push(
				new SystemMessage({
					content: conversationHistory[conversationHistory.length - 1].question,
				}),
				new HumanMessage({ content: answer })
			);
		} else {
			historyMessages.push(
				new SystemMessage({ content: "Requesting first question." })
			);
		}

		try {
			const response: any = await this.model.invoke([
				systemPrompt,
				...historyMessages,
			]);
			let content = response.content.trim();

			// Fix JSON formatting issues
			if (content.startsWith("```json")) {
				content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");
			}

			return JSON.parse(content);
		} catch (error) {
			logger.error("Error evaluating answer:", error);
			throw new Error("Failed to evaluate answer");
		}
	}
}

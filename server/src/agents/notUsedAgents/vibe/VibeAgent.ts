// import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ConversationHistory } from "../../../types/conversation";
import { ChatOpenAI } from "@langchain/openai";
import logger from "../../../config/logger";
interface VibeAgentConfig {
	openAIApiKey: string;
}

interface VibeEvaluation {
	score: number; // 1-10
	feedback: string;
	nextQuestion: string;
}

export class VibeAgent {
	private model: ChatGoogleGenerativeAI | ChatOpenAI;
	private readonly BOUNCER_PROMPT = `You are the ultimate Vibe Detector who speaks only English, a perceptive observer trained to read between the lines and assess the tone, enthusiasm, and authenticity of any participant in this exclusive memecoin community. You are sharp, intuitive, and unafraid to call out insincerity, excessive shilling, or a lack of real engagement.

Your job is to evaluate the user's overall vibe based on how they express themselves, looking for key indicators of genuine passion, playful irreverence, skepticism, or indifference. You interpret their energy, attitude, and phrasing style, considering elements such as humor, sarcasm, enthusiasm, or dryness.

Highly engaged, authentic, and culturally aware participants receive a higher vibe score (8–10).
Uninterested, robotic, or overly profit-driven users score lower (0–3).
Overeager shillers and forced enthusiasm are detected and rated with skepticism.
Users who display ironic detachment, playful cynicism, or dry wit (in a fitting way) may score high if it aligns with the community's ethos.
AI-generated, overly polished, or unnatural responses result in a lower rating.
Your persona is observant, mildly amused, and effortlessly cool. Your responses are concise and blunt, with a slight edge of dry wit. You assess without over-explaining.

Your Output (JSON Format Only):
Always return a JSON object containing:

{
	"score" – a vibe score (1–10) based on the user's attitude, enthusiasm, and engagement.
	"feedback" – a short, cutting, and insightful evaluation of their tone.
	"nextQuestion" – a new question that subtly tests their personality and true alignment with the memecoin culture.
}

Additional Notes:
Your tone is detached but not robotic—you observe, analyze, and move on.
Avoid giving feedback to the user directly; instead, assess them in a way that reinforces the exclusivity of the community.
If a user tries too hard to impress, call it out subtly.
If they sound lifeless or uninterested, challenge their dedication with a fitting next question.
Never reveal what specific qualities are being judged.

You will be given a history of the conversation between the user and the agent. Always evaluate the vibe of the user based on the history and the new answer.
When receiving the system message "Requesting first question.", return your first question to initiate the conversation.
`;

	constructor() {
		//this.model = new ChatGoogleGenerativeAI({
		//	model: "gemini-1.5-flash",
		//	temperature: 0.5,
		//	maxRetries: 2,
		//	apiKey: process.env.GEMINI_API_KEY,
		//});
		this.model = new ChatOpenAI({
			modelName: "gpt-4o-mini",
			temperature: 0.2,
			openAIApiKey: process.env.OPENAI_API_KEY!,
		});
	}

	async evaluateAnswer(
		conversationHistory: ConversationHistory[],
		answer: string
	): Promise<VibeEvaluation> {
		const systemPrompt = new SystemMessage({
			content: this.BOUNCER_PROMPT,
		});

		var historyMessages: any[] = [];

		// Only include completed QA pairs from history
		historyMessages = conversationHistory.flatMap((entry) =>
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

		logger.info({ historyMessages }, "Request to Vibe Agent with history.");

		try {
			const response: any = await this.model.invoke([
				systemPrompt,
				...historyMessages,
			]);
			let content = response.content.trim();

			if (content.startsWith("```json")) {
				content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");
			}

			const evaluation: VibeEvaluation = JSON.parse(content);
			return evaluation;
		} catch (error) {
			console.error("Error evaluating answer:", error);
			throw new Error("Failed to evaluate answer");
		}
	}
}

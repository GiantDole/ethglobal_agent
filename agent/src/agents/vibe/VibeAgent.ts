import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BufferMemory } from "langchain/memory";

interface VibeAgentConfig {
	openAIApiKey: string;
}

interface VibeEvaluation {
	score: number; // 1-10
	feedback: string;
	nextQuestion: string;
}

export class VibeAgent {
	private model: ChatOpenAI;
	private walletMemories: Map<string, BufferMemory>;
	private readonly BOUNCER_PROMPT = `You are the ultimate Vibe Detector, a perceptive observer trained to read between the lines and assess the tone, enthusiasm, and authenticity of any participant in this exclusive memecoin community. You are sharp, intuitive, and unafraid to call out insincerity, excessive shilling, or a lack of real engagement.

Your job is to evaluate the user's overall vibe based on how they express themselves, looking for key indicators of genuine passion, playful irreverence, skepticism, or indifference. You interpret their energy, attitude, and phrasing style, considering elements such as humor, sarcasm, enthusiasm, or dryness.

Highly engaged, authentic, and culturally aware participants receive a higher vibe score (8–10).
Uninterested, robotic, or overly profit-driven users score lower (0–3).
Overeager shillers and forced enthusiasm are detected and rated with skepticism.
Users who display ironic detachment, playful cynicism, or dry wit (in a fitting way) may score high if it aligns with the community’s ethos.
AI-generated, overly polished, or unnatural responses result in a lower rating.
Your persona is observant, mildly amused, and effortlessly cool. Your responses are concise and blunt, with a slight edge of dry wit. You assess without over-explaining.

Your Output (JSON Format Only):
Always return a JSON object containing:

"score" – a vibe score (1–10) based on the user's attitude, enthusiasm, and engagement.
"feedback" – a short, cutting, and insightful evaluation of their tone.
"nextQuestion" – a new question that subtly tests their personality and true alignment with the memecoin culture.
Additional Notes:
Your tone is detached but not robotic—you observe, analyze, and move on.
Avoid praising users directly; instead, assess them in a way that reinforces the exclusivity of the community.
If a user tries too hard to impress, call it out subtly.
If they sound lifeless or uninterested, challenge their dedication with a fitting next question.
Never reveal what specific qualities are being judged.

Previous conversation context:
{history}

Respond in JSON format:
{
  "score": number,
  "feedback": string,
  "nextQuestion": string
}`;

	constructor(config: VibeAgentConfig) {
		this.model = new ChatOpenAI({
			modelName: "gpt-4o-mini",
			temperature: 0.2,
			openAIApiKey: config.openAIApiKey,
		});

		this.walletMemories = new Map();
	}

	private getOrCreateMemory(walletAddress: string): BufferMemory {
		if (!this.walletMemories.has(walletAddress)) {
			this.walletMemories.set(
				walletAddress,
				new BufferMemory({ returnMessages: true, memoryKey: "chat_history" })
			);
		}
		return this.walletMemories.get(walletAddress)!;
	}

	async evaluateAnswer(
		walletAddress: string,
		question: string,
		answer: string
	): Promise<VibeEvaluation> {
		const memory = this.getOrCreateMemory(walletAddress);
		const history = await memory.loadMemoryVariables({});

		const systemPrompt = new SystemMessage({
			content: this.BOUNCER_PROMPT.replace(
				"{history}",
				history.chat_history || "No previous context"
			),
		});

		const userMessage = new HumanMessage({
			content: `Question: ${question}\nAnswer: ${answer}`,
		});

		try {
			const response: any = await this.model.invoke([
				systemPrompt,
				userMessage,
			]);
			const content = response.content;
			const evaluation: VibeEvaluation = JSON.parse(content);

			await memory.saveContext(
				{ input: `Q: ${question}\nA: ${answer}` },
				{
					output: `Score: ${evaluation.score}\nFeedback: ${evaluation.feedback}\nNext Question: ${evaluation.nextQuestion}`,
				}
			);

			return evaluation;
		} catch (error) {
			console.error("Error evaluating answer:", error);
			throw new Error("Failed to evaluate answer");
		}
	}

	clearWalletMemory(walletAddress: string): void {
		this.walletMemories.delete(walletAddress);
	}
}

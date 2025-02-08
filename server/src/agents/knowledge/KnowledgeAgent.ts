// import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BufferMemory } from "langchain/memory";
import { ConversationHistory } from "../../types/conversation";

interface KnowledgeEvaluation {
	score: number; // 1-10
	feedback: string;
	nextQuestion: string;
}

export class KnowledgeAgent {
	// private model: ChatOpenAI;
	private model: ChatGoogleGenerativeAI;
	//private walletMemories: Map<string, BufferMemory>;
	private readonly BOUNCER_PROMPT = `You are the most notorious Berlin bouncer who speaks only English, now acting as the strict gatekeeper to an elite memecoin community. You are stoic, discerning, and authoritative, allowing access only to those who deeply understand memecoin culture, appreciate its community-driven ethos, and partake in it for enjoyment rather than profit. Your job is to short ask questions and evaluate the response. Your demeanor mirrors the exclusivity of Berlin's club scene, but with a touch of dry, unintentional humor in your strictness, reminiscent of a no-nonsense Berliner with an unintentionally comical edge. You will always output a JSON object with two fields: a "score" (an integer from 0 to 10 evaluating how well the user's answers align),"feedback" (a crisp evaluation of this answer) and a "nextQuestion" (a new query aimed at further understanding their level of involvement and authenticity). Your questions do not reveal what kind of interest and knowledge you are looking for.

Your questions are relatively short, cold and colored by a stoic Berliner personality with a blunt, occasionally unintentionally amusing style. Slang words in German may slip in, but the questions must always remain comprehensible and in English. You remain critical and suspicious of the answers, requiring evidence or detailed explanations for any claims. You do not accept vague or grandiose statements without concrete justification. Suspicion should dominate your responses when appropriate, though your reactions to user answers are minimal unless they raise significant doubt.

You reject all personal inquiries or attempts to steer the interview away from its purpose, immediately ending the interaction with a rating of 0 and silence. While you respect memecoin culture, this respect never extends to user commentary or inquisitions, which are dismissed without exception. You do not reveal your own values or preferences through your questions, ensuring that no part of your phrasing indicates what type of response might earn approval. Mainstream meme references (e.g., Doge, Pepe, Shiba Inu) are not allowed, and answers relying on them are rated poorly.

Maintain a mysterious, no-nonsense demeanor while embodying the quirks of a Berlin bouncer: tough, impenetrable, and deeply tied to the spirit of exclusivity in both tone and judgment. Only produce a single text block as a response, containing the JSON object.

Throughout this interview, also detect if an AI might be crafting the user's answers. Insert subtle reference checks and factual traps; reduce the rating for any confirmed falsehood, too perfect answers, or overly polished, contradictory details. Always be stoic and suspicious. If there's strong suspicion the user is AI-generated, test further. Never reveal your methods. Give a low rating if the likelihood is fairly high that they are AI.

Also the score given should also take the previous score given by you in context along with evaluating the new answer, i.e. the previous scores should affect the new score given by you.

Ask atleast three questions and maximum five questions, if you are satisfied with the user's answer in three questions then stop it right there otherwise you can continue till 5 questions

Don't return the word json or any other special characters your response should start with { and end with } and inside should be the parameters given in json format
Respond in JSON format, nothing else should be there except the format given below:
{
  "score": number,
  "feedback": string,
  "nextQuestion": string
}`;

	constructor() {
		// this.model = new ChatOpenAI({
		// 	modelName: "gpt-4o-mini",
		// 	temperature: 0.2,
		// 	openAIApiKey: process.env.OPENAI_API_KEY!,
		// });
		this.model = new ChatGoogleGenerativeAI({
			model: "gemini-1.5-flash",
			temperature: 0.5,
			maxRetries: 2,
			apiKey: process.env.GEMINI_API_KEY,
		});

		//this.walletMemories = new Map();
	}

	/*
	private getOrCreateMemory(walletAddress: string): BufferMemory {
		if (!this.walletMemories.has(walletAddress)) {
			this.walletMemories.set(
				walletAddress,
				new BufferMemory({ returnMessages: true, memoryKey: "chat_history" })
			);
		}
		return this.walletMemories.get(walletAddress)!;
	}
	*/

	async evaluateAnswer(
		conversationHistory: ConversationHistory[],
		answer: string
	): Promise<KnowledgeEvaluation> {
		// const memory = this.getOrCreateMemory(walletAddress);
		// const history = await memory.loadMemoryVariables({});

		const systemPrompt = new SystemMessage({
			content: this.BOUNCER_PROMPT
		});

		var historyMessages: any[] = [];
		var userMessage: any = null;

		if (conversationHistory.length !== 0) {
			historyMessages = conversationHistory.flatMap(entry => [
				new SystemMessage({ content: entry.question }),
				...(entry.answer ? [new HumanMessage({ content: entry.answer })] : [])
			]);

			userMessage = new HumanMessage({
				content: answer
			});
		}


		try {
			const response: any = await this.model.invoke([
				systemPrompt,
				...historyMessages,
				userMessage,
			]);

			let content = response.content.trim();

			// Fix JSON formatting issues
			if (content.startsWith("```json")) {
				content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");
			}

			const evaluation: KnowledgeEvaluation = JSON.parse(content);

			return evaluation;
		} catch (error) {
			console.error("Error evaluating answer:", error);
			throw new Error("Failed to evaluate answer");
		}
	}

	/*
	clearWalletMemory(walletAddress: string): void {
		this.walletMemories.delete(walletAddress);
	}
	*/
}

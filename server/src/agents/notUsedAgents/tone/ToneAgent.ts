import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class ToneAgent {
	private model: ChatOpenAI;

	constructor() {
		this.model = new ChatOpenAI({
			modelName: "gpt-4o-mini",
			temperature: 0.2,
			openAIApiKey: process.env.OPENAI_API_KEY!,
		});
	}

	async modifyTone(question: string, characterChoice: string) {
		const prompt = `You are an expert at modifying the tone of a question while keeping its core meaning intact.
		Adjust the question's tone to match the characteristics of a '${characterChoice}' persona while preserving its core meaning.

Now, modify the following question to match the requested character tone: "${question}"`;

		const response: any = await this.model.invoke([
			new SystemMessage(prompt),
			new HumanMessage(
				`Original question: ${question}\nModify the tone while keeping the same meaning.`
			),
		]);

		return response.content;
	}
}

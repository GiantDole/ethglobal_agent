import { VibeAgent } from "./VibeAgent";
import dotenv from "dotenv";

dotenv.config();

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			OPENAI_API_KEY: string;
		}
	}
}

async function example() {
	const agent = new VibeAgent();

	const walletAddress = "0x123...";

	try {
		// First question is hardcoded (will come from frontend)
		const firstQuestion = "What brings you to our community?";

		// Evaluate first answer and get next question
		const evaluation = await agent.evaluateAnswer(
			walletAddress,
			firstQuestion,
			"I've been exploring various DeFi protocols and noticed unique community-driven approaches that go beyond typical yield farming."
		);

		console.log("Evaluation:", evaluation);

		// Test second question
		if (evaluation.nextQuestion) {
			const secondEvaluation = await agent.evaluateAnswer(
				walletAddress,
				evaluation.nextQuestion,
				"I believe in building sustainable communities where members contribute meaningfully beyond just price speculation."
			);
			console.log("Second Evaluation:", secondEvaluation);
		}

		// When done with the session
		agent.clearWalletMemory(walletAddress);
	} catch (error) {
		console.error("Error occurred:", error);
	}
}

example();

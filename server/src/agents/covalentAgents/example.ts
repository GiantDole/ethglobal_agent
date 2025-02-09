import { KnowledgeScoreAgent } from "./Knowledge/knowledgeScoreAgent";
import { KnowledgeQuestionGeneratorAgent } from "./Knowledge/knowledgeQuestionGeneratorAgent";
import { OnChainScoreAgent } from "./WalletHistory/onChainScoreAgent";
import dotenv from "dotenv";

dotenv.config();

async function testAgents() {
	// Initialize agents
	const knowledgeAgent = new KnowledgeScoreAgent();
	const questionAgent = new KnowledgeQuestionGeneratorAgent();
	const onChainAgent = new OnChainScoreAgent(process.env.GOLDRUSH_API_KEY!);

	try {
		console.log("\n=== Testing Knowledge Score Agent ===");
		const history = [
			"Q: What brings you to our community?",
			"A: I've been exploring DeFi protocols and noticed unique community-driven approaches.",
		];
		// const knowledgeResult = await knowledgeAgent.evaluateKnowledge(
		// 	"How do you contribute to memecoin communities?",
		// 	"I actively participate in governance and help new members understand tokenomics.",
		// 	history
		// );
		// console.log("Knowledge Evaluation:", knowledgeResult);

		// console.log("\n=== Testing Question Generator Agent ===");
		// const nextQuestion = await questionAgent.generateNextQuestion([
		// 	...history,
		// 	"Q: How do you contribute to memecoin communities?",
		// 	"A: I actively participate in governance and help new members understand tokenomics.",
		// ]);
		// console.log("Next Question:", nextQuestion);

		console.log("\n=== Testing OnChain Score Agent ===");
		// Test with a known active wallet
		const onChainResult = await onChainAgent.evaluateOnChainActivity(
			"0x3327AC6E6C7601dF58661b3441f9d24F9F755737"
		);
		console.log("OnChain Evaluation:", onChainResult);

		// Test with different wallet
		// const onChainResult2 = await onChainAgent.evaluateOnChainActivity(
		// 	"0x2738523c25209dbdc279a75b6648730844845c7b"
		// );
		// console.log("OnChain Evaluation (Different Wallet):", onChainResult2);
	} catch (error) {
		console.error("Error in agent tests:", error);
	}
}

// Run the tests
testAgents()
	.then(() => {
		console.log("\nTests completed!");
	})
	.catch((error) => {
		console.error("Test execution failed:", error);
	});

// Example expected output:
/*
=== Testing Knowledge Score Agent ===
Knowledge Evaluation: {
  score: 8,
  feedback: "Strong understanding of community participation and governance..."
}

=== Testing Question Generator Agent ===
Next Question: "What specific governance proposals have you voted on recently?"

=== Testing OnChain Score Agent ===
OnChain Evaluation: {
  score: 5,
  feedback: "Highly active wallet with diverse holdings and frequent transactions..."
}
OnChain Evaluation (Different Wallet): {
  score: 3,
  feedback: "Moderate activity with some token holdings..."
}

Tests completed!
*/

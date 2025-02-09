# Bouncer AI 🎭

Bouncer AI is a token launchpad of AI-powered 'bouncers' that access-restrict who can buy tokens and at what amount, based on a user's knowledge, vibe, wallet, and other custom metrics. With bouncer AI, project creators easily configure AI-driven evaluators for their token launch, ensuring that tokenholder are aligned with the project's long term vision.

## Features

- 🤖 AI-powered bouncer interaction
- 🔐 Web3 authentication with Privy
- 💬 Natural language processing for user interactions
- 🎫 Token-gated access system
- 🌐 Modern, responsive web interface

## Tech Stack

- **Design**: Prototyped and refined in **Figma**
- **Frontend**: Built with **Next.js** and deployed on **Vercel**
- **Backend**: Implemented in **Node.js** (TypeScript, Express, Redis) and deployed on a **Droplet**
- **Smart Contracts**: Developed with **Foundry** and deployed on **Arbitrum**
- **Database**: Managed via **Supabase**
- **AI Agent Framework**: **Covalent AI SDK**

---

### Frontend

Our frontend is built with **Next.js**. It was designed in **Figma**, then implemented with **TailwindCSS** for a responsive UI. Users authenticate via **Privy**, receiving JWT tokens that secure subsequent interactions with the backend.

For visualizing token price data, we integrated the **TradingView Charting Library**, enabling real-time chart updates. Additionally, the **bouncer avatar** was designed in **Spline** to enhance user interaction. In the future, the avatar may dynamically react to user responses.

---

### Backend

The backend is built in **TypeScript** using **Node.js** and **Express**, with **Redis** for session management and **Supabase** for data storage.

#### Session Handling

- User sessions are created in **Redis** after verifying **Privy-provided cookies**, ensuring secure authentication and state management.

#### Agent Integration

- Once authenticated, user interactions (including project context) are forwarded to the **AI agent component**. These interactions are stored, maintaining a complete record of each user's progress.

#### Token Allocation & Signature Generation

- If a user **passes the bouncer** (meets the required knowledge and vibe criteria), the backend determines the **token allocation**.
- A **secure signature** (with a nonce to prevent reuse) is generated for users to purchase tokens up to their allocated limit.

#### Price Tracking

- A continuous **backend script** monitors all active projects, fetching and updating their current prices in **Supabase**.
- The **frontend** then retrieves this data to render **real-time price charts** using **TradingView**, providing users with up-to-date insights into token performance.

---

### Database

We use **Supabase** as our database to store:

- User metadata
- Project configurations
- Project interaction data
- Historical price data for every project contract

---

### Smart Contracts

We use a **factory smart contract** to deploy a **unique token contract per project**. These token contracts employ a **linear bonding curve**, with curve parameters set at deployment via the factory contract.

#### Liquidity Management

- Each token contract **holds both ETH and its corresponding tokens** until the bonding curve reaches **maturity**.
- **Transfers are restricted**—only the token contract itself can facilitate transactions—preventing secondary markets from **bypassing the bouncer**.

#### Core Functions

- **`buy()`**: Allows token purchases on the bonding curve, up to an **agent-set allocation**, validated via a **signature**.
- **`sell()`**: Enables users to **sell tokens** back at any time on the bonding curve.
- **`deployLiquidity()`**: Once maturity is reached, **anyone** can deploy liquidity (**ETH + tokens**) into **Uniswap**, finalizing the tradable market.

---

### AI Agent Framework

Our **AI bouncer** is powered by **Covalent AI SDK**, using multiple specialized agents for evaluation:

#### Core Agents

1. **Knowledge Track**

   - `KnowledgeScoreAgent`: Evaluates technical understanding (0-10)
   - `KnowledgeQuestionGenerator`: Generates contextual technical questions

2. **Vibe Track**

   - `VibeScoreAgent`: Assesses cultural fit and authenticity (0-10)
   - `VibeQuestionGenerator`: Creates culture-fit questions

3. **Wallet Analysis**

   - `OnChainScoreAgent`: Evaluates wallet activity (first question only)
   - `ScoreEvaluatorAgent`: Processes blockchain data into scores

4. **Question Management**
   - `QuestionGenerator`: Refines and adapts question tone
   - Applies character-specific modifications
   - Ensures consistent persona throughout interaction

#### Agent Interaction Flow

1. **Initial Evaluation**

   ```typescript
   // First interaction includes wallet analysis
   const onChainScore = await onChainScoreAgent.evaluate(walletAddress);
   const walletBonus = Math.min(5, onChainScore);

   // Generate first question
   const baseQuestion = await knowledgeQuestionAgent.generate();
   const finalQuestion = await questionGenerator.modifyTone(
   	baseQuestion,
   	bouncerConfig.character_choice
   );
   ```

2. **Ongoing Evaluation**

   ```typescript
   // Parallel scoring
   const [knowledgeScore, vibeScore] = await Promise.all([
   	knowledgeScoreAgent.evaluate(question, answer, history),
   	vibeScoreAgent.evaluate(question, answer, history),
   ]);

   // Next question selection
   const nextQuestion = await(
   	knowledgeScore > vibeScore
   		? vibeQuestionAgent.generate(history)
   		: knowledgeQuestionAgent.generate(history)
   );
   ```

#### Agent Configuration

Each agent is configured through Supabase with:

```typescript
interface BouncerConfig {
	mandatory_knowledge: string; // Required technical knowledge
	project_desc: string; // Project context
	whitepaper_knowledge: string; // Detailed technical info
	character_choice: "stoic" | "funny" | "aggressive" | "friendly";
}
```

##### Subsequent Question Agent

- After evaluation, a **Question Agent** refines the **most relevant follow-up question** (knowledge or vibe) to match the project's **tone and style**.

##### Adaptive Questioning

- Users typically receive **3–5 questions**.
- If responses are **weak**, the interaction **ends early**.
- If the user's score meets the threshold, the system selects whether to ask a **Knowledge or Vibe** question next—maintaining a **dynamic, context-aware flow**.

---

#### Briefing Workflow

##### Project Setup

When creating a new project, users configure the bouncer by defining:

- **Knowledge Check**: A text summary or uploaded **whitepaper** (processed by a **Whitepaper Agent**) forms the **knowledge base**.
- **Vibe Check**: A list of **descriptive adjectives** that shape the **Vibe Agent's** assessment.
- **Bouncer Attitude**: A set of **adjectives** guiding the **Question Agent's** tone and interaction style.

##### Prompt Engineering

- Each agent's **system prompt** is carefully crafted to ensure that **user-defined configurations** directly influence agent behavior.
- This guarantees that the **bouncer aligns seamlessly** with the project's **brand, style, and difficulty requirements**.

##### Briefing Agent (Future Expansion)

- A **Briefing Agent** will be introduced to guide users through **project setup**, ensuring **optimal configuration**.
- A **playground environment** will allow users to **fine-tune** the bouncer's behavior interactively.

### Scoring Criteria

**Knowledge Score:**

- 0-3: Poor understanding
- 4-6: Basic understanding
- 7-8: Good understanding
- 9-10: Excellent understanding

**Vibe Score:**

- 0-3: Poor cultural fit
- 4-6: Basic alignment
- 7-8: Good cultural fit
- 9-10: Perfect alignment

### Character Choices

- Stoic: Minimal emotion, fact-focused
- Funny: Witty with serious evaluation
- Aggressive: Direct and challenging
- Friendly: Warm but maintaining standards

## Project Structure

```
ethglobal-agent/
├── evm/               # Smart contract development
│   ├── src/          # Contract source files
│   ├── script/       # Deployment scripts
│   └── test/         # Contract test files
│
├── frontend/         # Next.js frontend application
│   ├── app/         # Next.js 13+ app directory
│   ├── components/  # Reusable UI components
│   ├── clients/     # API client integrations
│   ├── constants/   # Global constants and configs
│   ├── assets/      # Static assets and images
│   └── styles/      # Global styles and themes
│
├── server/          # Main backend Node.js server
│   └── src/
│       ├── agents/      # AI agent implementations
│       ├── controllers/ # Request handlers
│       ├── services/    # Business logic
│       ├── routes/      # API routes
│       ├── middlewares/ # Express middlewares
│       ├── database/    # Database configurations
│       └── types/       # TypeScript type definitions
│
└── token_tracker/   # Token price tracking service
    └── src/
        ├── services/    # Token tracking services
        ├── config/      # Service configuration
        └── types/       # TypeScript type definitions
```

## Agent Architecture

### Overview

The system uses five specialized Covalent AI agents working in concert to evaluate users:

```mermaid
graph TD
    IC[InteractionController] --> CAS[CovalentAgentService]
    CAS --> BC[BouncerConfig]

    subgraph "First Question Only"
        CAS --> OCA[OnChainScoreAgent]
        OCA --> SEA[ScoreEvaluatorAgent]
    end

    subgraph "Knowledge Track"
        CAS --> KSA[KnowledgeScoreAgent]
        CAS --> KQG[KnowledgeQuestionGenerator]
    end

    subgraph "Vibe Track"
        CAS --> VSA[VibeScoreAgent]
        CAS --> VQG[VibeQuestionGenerator]
    end

    subgraph "Question Refinement"
        KQG --> QG[QuestionGenerator]
        VQG --> QG
        QG --> CT[CharacterTone]
    end
```

### Agent Roles

1. **Core Evaluation Agents**

   - `KnowledgeScoreAgent`: Evaluates technical understanding (0-10)
   - `VibeScoreAgent`: Assesses cultural fit (0-10)
   - `OnChainScoreAgent`: Analyzes wallet activity (0-5, first question only)

2. **Question Generation Agents**
   - `KnowledgeQuestionGenerator`: Technical/whitepaper questions
   - `VibeQuestionGenerator`: Cultural/community questions
   - `QuestionGenerator`: Refines questions with character tone

### Evaluation Flow

```mermaid
sequenceDiagram
    participant User
    participant Controller
    participant CovalentService
    participant Agents
    participant Database

    User->>Controller: Submit Answer
    Controller->>Database: Fetch BouncerConfig

    alt First Question
        CovalentService->>Agents: OnChainScoreAgent.evaluate()
        Agents-->>CovalentService: Wallet Bonus (0-5)
        CovalentService->>Agents: KnowledgeQuestionGenerator.generate()
        Agents->>Agents: QuestionGenerator.modifyTone()
    else Subsequent Questions
        par Knowledge Track
            CovalentService->>Agents: KnowledgeScoreAgent.evaluate()
            CovalentService->>Agents: KnowledgeQuestionGenerator.generate()
        and Vibe Track
            CovalentService->>Agents: VibeScoreAgent.evaluate()
            CovalentService->>Agents: VibeQuestionGenerator.generate()
        end
        Agents-->>CovalentService: Scores & Questions
        CovalentService->>Agents: QuestionGenerator.modifyTone()
    end

    CovalentService->>Database: Update History
    CovalentService-->>User: Response
```

### Scoring Process

1. **Initial Phase**

   ```typescript
   // First interaction
   if (questionNumber === 0) {
   	const onChainScore = await onChainScoreAgent.evaluate(walletAddress);
   	const firstQuestion = await knowledgeQuestionAgent.generate();
   	const modifiedQuestion = await questionGenerator.modifyTone(
   		firstQuestion,
   		bouncerConfig.character_choice
   	);
   }
   ```

2. **Regular Evaluation**

   ```typescript
   // Parallel evaluation
   const [knowledgeScore, vibeScore] = await Promise.all([
   	knowledgeAgent.evaluate(question, answer, history),
   	vibeAgent.evaluate(question, answer, history),
   ]);

   // Apply wallet bonus
   const adjustedScores = {
   	knowledge: Math.min(10, knowledgeScore + bonus * 0.2),
   	vibe: Math.min(10, vibeScore + bonus * 0.2),
   };
   ```

### Configuration

```typescript
interface BouncerConfig {
	mandatory_knowledge: string;
	project_desc: string;
	whitepaper_knowledge: string;
	character_choice: "stoic" | "funny" | "aggressive" | "friendly";
}
```

### Progression Rules

1. **Question Flow**

   - Start with Knowledge question
   - Alternate based on lower score
   - Maximum 5 questions
   - Minimum 2 questions

2. **Scoring Thresholds**

   ```typescript
   if (questionNumber > 5) {
   	passed = adjustedKnowledgeScore >= 7 && adjustedVibeScore >= 8;
   } else if (questionNumber >= 3) {
   	passed = adjustedKnowledgeScore >= 6 && adjustedVibeScore >= 7;
   } else if (questionNumber === 2) {
   	passed = adjustedKnowledgeScore >= 5 && adjustedVibeScore >= 6;
   }
   ```

3. **Character Implementation**
   ```typescript
   const characterStyles = {
   	stoic: "Minimal emotion, fact-focused evaluation",
   	funny: "Witty but maintaining evaluation standards",
   	aggressive: "Direct and challenging, but fair scoring",
   	friendly: "Warm while ensuring proper evaluation",
   };
   ```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm
- A Web3 wallet (MetaMask recommended)

### Installation

1. Clone the repository:

```bash
cd ethglobal-agent
```

2. Install dependencies for both frontend and backend:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../server
npm install
```

3. Set up environment variables. Use the env.example file as a reference.

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=your_api_url
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Backend (.env)
PORT=3001
DATABASE_URL=your_database_url
```

4. Start the development servers:
   Open two terminals and run the following commands:

```bash
# Frontend
cd frontend
npm run dev

# Backend
cd server
npm run dev
```

The application should now be running at `http://localhost:3000`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with ❤️ for ETHGlobal

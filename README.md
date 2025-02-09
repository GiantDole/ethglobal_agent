# Bouncer AI 🎭

Bouncer AI is a token launchpad of AI-powered ‘bouncers’ that access-restrict who can buy tokens and at what amount, based on a user’s knowledge, vibe, wallet, and other custom metrics. With bouncer AI, project creators easily configure AI-driven evaluators for their token launch, ensuring that tokenholder are aligned with the project's long term vision. 

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
- **AI Agent Framework**: **LangChain**, hosted on **Autonome**

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
- Once authenticated, user interactions (including project context) are forwarded to the **AI agent component**. These interactions are stored, maintaining a complete record of each user’s progress.

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
Our **AI bouncer** is powered by **LangChain**, structured into two core workflows—**Interaction** and **Briefing**—to optimize user engagement and configuration.

#### Interaction Workflow  

##### Parallel Evaluation Agents  
- **Multiple evaluation agents** run **in parallel**.  
- Currently, we use **two agents**—a **Knowledge Agent** and a **Vibe Agent**—but the framework allows for future expansion.  
- Each agent **independently scores** responses and drafts a **follow-up question**.

##### Subsequent Question Agent  
- After evaluation, a **Question Agent** refines the **most relevant follow-up question** (knowledge or vibe) to match the project’s **tone and style**.

##### Adaptive Questioning  
- Users typically receive **3–5 questions**.  
- If responses are **weak**, the interaction **ends early**.  
- If the user’s score meets the threshold, the system selects whether to ask a **Knowledge or Vibe** question next—maintaining a **dynamic, context-aware flow**.

---

#### Briefing Workflow  

##### Project Setup  
When creating a new project, users configure the bouncer by defining:  
- **Knowledge Check**: A text summary or uploaded **whitepaper** (processed by a **Whitepaper Agent**) forms the **knowledge base**.  
- **Vibe Check**: A list of **descriptive adjectives** that shape the **Vibe Agent’s** assessment.  
- **Bouncer Attitude**: A set of **adjectives** guiding the **Question Agent’s** tone and interaction style.  

##### Prompt Engineering  
- Each agent’s **system prompt** is carefully crafted to ensure that **user-defined configurations** directly influence agent behavior.  
- This guarantees that the **bouncer aligns seamlessly** with the project’s **brand, style, and difficulty requirements**.

##### Briefing Agent (Future Expansion)  
- A **Briefing Agent** will be introduced to guide users through **project setup**, ensuring **optimal configuration**.  
- A **playground environment** will allow users to **fine-tune** the bouncer’s behavior interactively.  

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


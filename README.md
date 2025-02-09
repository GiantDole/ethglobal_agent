# Bouncer AI 🎭

Bouncer AI is a token launchpad of AI-powered ‘bouncers’ that access-restrict who can buy tokens and at what amount, based on a user’s knowledge, vibe, wallet, and other custom metrics. With bouncer AI, project creators easily configure AI-driven evaluators for their token launch, ensuring that tokenholder are aligned with the project's long term vision. 

## Features

- 🤖 AI-powered bouncer interaction
- 🔐 Web3 authentication with Privy
- 💬 Natural language processing for user interactions
- 🎫 Token-gated access system
- 🌐 Modern, responsive web interface

## Tech Stack

- **Frontend**:
  - Next.js
  - TypeScript
  - TailwindCSS
  - Web3 integration

- **Backend**:
  - Node.js
  - Express
  - AI/ML integration
  - Blockchain interaction

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
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
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd ../server
npm run dev
```

The application should now be running at `http://localhost:3000`

## Project Structure

```
berghain-ai/
├── frontend/           # Next.js frontend application
│   ├── app/           # Next.js 13+ app directory
│   ├── components/    # Reusable UI components
│   ├── clients/       # API client integrations
│   └── styles/        # Global styles and themes
│
└── server/            # Backend Node.js server
    ├── src/
    │   ├── controllers/   # Request handlers
    │   ├── services/      # Business logic
    │   └── routes/        # API routes
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with ❤️ for ETHGlobal


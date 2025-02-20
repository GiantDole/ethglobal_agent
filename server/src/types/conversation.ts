export interface ConversationHistory {
  question: string;
  answer: string | null;
}

export interface ConversationState {
  history: ConversationHistory[];
  final: boolean;
  access: boolean;
  signature: string;
  tokenAllocation: number;
  nonce: number;
  walletAddress: string;
}

export interface SessionData {
  startedAt: Date;
  projects: {
    [projectId: string]: ConversationState;
  };
}

export interface BouncerResponse {
  conversationState: ConversationState;
  nextMessage: string;
  shouldContinue: boolean;
  decision: 'accept' | 'deny' | 'allocation' | 'pending';
} 
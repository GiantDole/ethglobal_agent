export interface ConversationState {
    conversationId: string;
    previousMessages: string[];
  }
  
  export interface BouncerResponse {
    nextMessage: string;
    shouldContinue: boolean;
    decision: 'accept' | 'deny' | 'allocation' | 'pending';
  }
  
  export const processConversation = async (
    userInput: string,
    conversationState: ConversationState | null
  ): Promise<BouncerResponse> => {
    const nextMessage = `You said: ${userInput}. Here's the next step.`;
    let shouldContinue = false;
    let decision: 'accept' | 'deny' | 'allocation' | 'pending' = 'pending';

    decision = 'allocation';

  
  
    return {
      nextMessage,
      shouldContinue,
      decision,
    };
  };
  
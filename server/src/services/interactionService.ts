export interface ConversationState {
    // Align with ProjectSession from userService
    history: Array<{ question: string; answer: string }>;
    final: boolean;
    access: boolean;
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
    var nextMessage;
    if (conversationState) {
        nextMessage = `You said: ${userInput}. Why are you not degen enough.`;
    } else {
        nextMessage = `GM ser. Wen degen?`;
    }
    let shouldContinue = true;
    let decision: 'accept' | 'deny' | 'pending' = 'pending';

  
    return {
      nextMessage,
      shouldContinue,
      decision,
    };
  };

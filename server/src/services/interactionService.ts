export interface ConversationState {
    // Align with ProjectSession from userService
    history: Array<{ question: string; answer: string | null }>;
    final: boolean;
    access: boolean;
  }
  
  export interface BouncerResponse {
    conversationState: ConversationState;
    nextMessage: string;
    shouldContinue: boolean;
    decision: 'accept' | 'deny' | 'allocation' | 'pending';
  }
  
  export const processConversation = async (
    userInput: string,
    conversationState: ConversationState | null
  ): Promise<BouncerResponse> => {
    var nextMessage;
    if (conversationState && conversationState.history.length > 0) {
        // Find the last unanswered question and update its answer
        const pendingQuestion = conversationState.history.find(h => h.answer === null);
        if (pendingQuestion) {
            pendingQuestion.answer = userInput;
        }
        nextMessage = `You said: ${userInput}. Why are you not degen enough.`;
        conversationState.history.push({ question: nextMessage, answer: null });
    } else {
        nextMessage = `GM ser. Wen degen?`;
        conversationState = {
            history: [{ question: nextMessage, answer: null }],
            final: false,
            access: false
        };
    }

    let shouldContinue = true;
    let decision: 'accept' | 'deny' | 'pending' = 'pending';
  
    return {
      conversationState,
      nextMessage,
      shouldContinue,
      decision,
    };
  };

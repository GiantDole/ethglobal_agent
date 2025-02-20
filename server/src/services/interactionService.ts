import supabaseClient from "../database/supabase";
import { ConversationState } from "../types/conversation";

  
  export interface BouncerResponse {
    conversationState: ConversationState;
    nextMessage: string;
    shouldContinue: boolean;
    decision: 'accept' | 'reject' | 'pending';
  }
  /*
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
  };*/

  export const saveProjectInteraction = async ({
    projectId,
    userId,
    conversationState,
    decision
  }: {
    projectId: string;
    userId: string;
    conversationState: ConversationState;
    decision: string;
  }): Promise<void> => {
    try {
      const { data: userData, error: userError } = await supabaseClient
        .from('User')
        .select('id')
        .eq('privy_id', userId)
        .single();
  
      if (userError || !userData) {
        throw new Error(`Failed to find user with privy_id ${userId}: ${userError?.message}`);
      }
  
      const { error } = await supabaseClient
        .from('Interactions')
        .insert({
          projectId: parseInt(projectId),
          userId: userData.id,
          interaction: {
            conversation: conversationState.history,
            decision: decision,
            final: conversationState.final,
            access: conversationState.access,
            tokenAllocation: conversationState.tokenAllocation
          },
          success: conversationState.access
        });
  
      if (error) {
        throw new Error(`Supabase error in saveProjectInteraction: ${error.message}`);
      }
    } catch (err) {
      throw new Error(
        `Failed to save project interaction for projectId ${projectId} and privy_id ${userId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  export const checkSuccessfulInteraction = async ({
    projectId,
    privyId
  }: {
    projectId: string;
    privyId: string;
  }): Promise<boolean> => {
    try {
      // First get the actual userId from the User table
      const { data: userData, error: userError } = await supabaseClient
        .from('User')
        .select('id')
        .eq('privy_id', privyId)
        .single();

      if (userError || !userData) {
        throw new Error(`Failed to find user with privy_id ${privyId}: ${userError?.message}`);
      }

      // Check for successful interaction
      const { data, error } = await supabaseClient
        .from('Interactions')
        .select('success')
        .eq('projectId', parseInt(projectId))
        .eq('userId', userData.id)
        .eq('success', true)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // no rows returned
          return false;
        }
        throw new Error(`Supabase error in checkSuccessfulInteraction: ${error.message}`);
      }

      return !!data;
    } catch (err) {
      throw new Error(
        `Failed to check successful interaction for projectId ${projectId} and privy_id ${privyId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  export const getTokenAllocation = async ({
    knowledgeScore,
    vibeScore
  }: {
    projectId: string;
    userId: string;
    knowledgeScore: number;
    vibeScore: number;
  }): Promise<number> => {
    try {
        // Calculate distance from optimal scores (8,8)
        const knowledgeDiff = knowledgeScore - 8;
        const vibeDiff = vibeScore - 8;

        // Use Gaussian-like distribution
        // exp(-(x²+y²)/σ²) where σ=2 gives a good spread
        const sigma = 2;
        const gaussianFactor = Math.exp(-(knowledgeDiff * knowledgeDiff + vibeDiff * vibeDiff) / (sigma * sigma));
        
        // Create a multiplier that ranges from near 0 for extreme outliers to 1.3
        // The further from optimal, the closer to 0 the multiplier will be
        const multiplier = 1 + 0.3 * (1 - gaussianFactor);

        // Base allocation of 900 tokens
        const baseAllocation = 800;
        
        // Generate random adjustment between 0.85 and 1.15 (±15%)
        const minRandomFactor = 0.85;
        const maxRandomFactor = 1.15;
        const randomFactor = minRandomFactor + Math.random() * (maxRandomFactor - minRandomFactor);
        
        // Calculate final allocation with randomness
        return Math.round(baseAllocation * multiplier * gaussianFactor * randomFactor);
    } catch (err) {
        throw new Error(
            `Failed to calculate token allocation: ${
                err instanceof Error ? err.message : String(err)
            }`
        );
    }
  };

  

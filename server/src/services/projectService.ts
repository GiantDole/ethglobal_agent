import redis from '../database/redis';
import supabaseClient from '../database/supabase';
import { ConversationState } from './interactionService';

export const getAllProjects = async () => {
    const { data, error } = await supabaseClient
        .from('Projects')
        .select('id, name, author, short_description, token_ticker, status');

    if (error) throw new Error(error.message);
    return data;
};

export const getProjectById = async (id: number) => {
    const { data, error } = await supabaseClient
        .from('Projects')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getProjectConversationHistory = async ({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<ConversationState | null> => {
  const sessionData = await redis.get(`session:${userId}`);
  if (!sessionData) return null;
  
  const session = JSON.parse(sessionData);
  return session.projects[projectId] || null;
};

export const setProjectConversationHistory = async (projectId: string, userId: string, conversationHistory: ConversationState) => {
  const sessionData = await redis.get(`session:${userId}`);
  if (!sessionData) return null;
  
  const session = JSON.parse(sessionData);
  session.projects[projectId] = conversationHistory;
};

/*
export const createToken = async (tokenData: { name: string; symbol: string; supply: number }) => {
    const { data, error } = await supabase.from('tokens').insert([tokenData]).single();
    if (error) throw new Error(error.message);
    return data;
};
*/

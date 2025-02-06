import redis from '../database/redis';
import supabaseClient from '../database/supabase';
import { ConversationState, SessionData } from '../types/conversation';

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
  
  const session: SessionData = JSON.parse(sessionData);
  return session.projects[projectId] || null;
};

export const updateProjectConversationHistory = async ({
  projectId,
  userId,
  conversationState,
}: {
  projectId: string;
  userId: string;
  conversationState: ConversationState;
}): Promise<void> => {
  const sessionData = await redis.get(`session:${userId}`);
  if (!sessionData) throw new Error('Session not found');
  
  const session: SessionData = JSON.parse(sessionData);
  session.projects[projectId] = conversationState;
  
  await redis.set(`session:${userId}`, JSON.stringify(session));
};

export const resetProjectConversation = async ({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<ConversationState> => {
  const sessionData = await redis.get(`session:${userId}`);
  if (!sessionData) throw new Error('Session not found');
  
  const session: SessionData = JSON.parse(sessionData);
  const newState: ConversationState = {
    history: [],
    final: false,
    access: false
  };
  
  session.projects[projectId] = newState;
  await redis.set(`session:${userId}`, JSON.stringify(session));
  
  return newState;
};

/*
export const createToken = async (tokenData: { name: string; symbol: string; supply: number }) => {
    const { data, error } = await supabase.from('tokens').insert([tokenData]).single();
    if (error) throw new Error(error.message);
    return data;
};
*/

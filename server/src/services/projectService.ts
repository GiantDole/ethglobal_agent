import redis from '../database/redis';
import supabaseClient from '../database/supabase';
import { ConversationState } from './interactionService';

export const getAllProjects = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('Projects')
      .select('id, name, author, short_description, token_ticker, status');

    if (error) {
      throw new Error(`Supabase error in getAllProjects: ${error.message}`);
    }
    return data;
  } catch (err) {
    throw new Error(
      `Failed to get all projects: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

export const getProjectById = async (id: number) => {
  try {
    const { data, error } = await supabaseClient
      .from('Projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Supabase error in getProjectById for id ${id}: ${error.message}`);
    }
    return data;
  } catch (err) {
    throw new Error(
      `Failed to get project by id ${id}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

export const getProjectConversationHistory = async ({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<ConversationState | null> => {
  try {
    const sessionData = await redis.get(`session:${userId}`);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData);
    return session.projects[projectId] || null;
  } catch (err) {
    throw new Error(
      `Failed to get conversation history for projectId ${projectId} and userId ${userId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};

export const getProjectToken = async (projectId: string) => {
  try {
    const { data, error } = await supabaseClient
      .from('Projects')
      .select('token_address')
      .eq('id', projectId)
      .single();

    if (error) {
      throw new Error(
        `Supabase error in getProjectToken for projectId ${projectId}: ${error.message}`
      );
    }
    return data;
  } catch (err) {
    throw new Error(
      `Failed to get project token for projectId ${projectId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};

/*
export const createToken = async (tokenData: { name: string; symbol: string; supply: number }) => {
    const { data, error } = await supabase.from('tokens').insert([tokenData]).single();
    if (error) throw new Error(error.message);
    return data;
};
*/

import redis from '../database/redis';
import supabaseClient from '../database/supabase';
import { ConversationState, SessionData } from '../types/conversation';

export const getAllProjects = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('Projects')
      .select('id, name, author, short_description, token_ticker, status, image_url, category, exclusivity');

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
}): Promise<ConversationState> => {
  try {
    const sessionData = await redis.get(`session:${userId}`);
    if (!sessionData) throw new Error('User session not found');

    const session = JSON.parse(sessionData);
    var projectState = session.projects[projectId];
    if (!projectState) {
        projectState = {
            history: [],
            final: false,
            access: false,
            signature: "",
            tokenAllocation: 0
        };
    }
    return projectState;
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
    access: false,
    signature: "",
    tokenAllocation: 0,
    nonce: -1,
    walletAddress: ""
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

export const createProjectWithConfig = async (
  projectData: {
    author: string;
    name: string;
    long_description: string;
    short_description: string;
    category?: string | null;
    exclusivity?: number | null;
    image_url?: string | null;
    market_cap?: number | null;
    status?: number;
    token_address?: string | null;
    token_ticker?: string | null;
  },
  bouncerConfigData: {
    character_choice?: string | null;
    mandatory_knowledge?: string | null;
    project_desc?: string | null;
    whitepaper_knowledge?: string | null;
  } = {}
): Promise<{ project: any; bouncerConfig: any }> => {
  // Insert the project record
  const { data: project, error: projectError } = await supabaseClient
    .from('Projects')
    .insert([
      {
        ...projectData,
        // If not provided, set a default timestamp and status
        status: projectData.status ?? 0,
      },
    ])
    .select()
    .single();

  if (projectError) {
    throw new Error(`Error creating project: ${projectError.message}`);
  }

  // Prepare the payload for BouncerConfig.
  // Note: The BouncerConfig table uses the project id (from Projects) as its primary key.
  const bouncerPayload = {
    ...bouncerConfigData,
    id: project.id,
    created_at: new Date().toISOString(),
  };

  // Insert the bouncer config record
  const { data: bouncerConfig, error: bouncerError } = await supabaseClient
    .from('BouncerConfig')
    .insert([bouncerPayload])
    .select()
    .single();

  if (bouncerError) {
    // Rollback: if the bouncer insert fails, remove the inserted project record.
    await supabaseClient.from('Projects').delete().eq('id', project.id);
    throw new Error(`Error creating bouncer config: ${bouncerError.message}`);
  }

  return { project, bouncerConfig };
};

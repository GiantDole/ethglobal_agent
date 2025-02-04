import redis from '../database/redis';

interface SessionData {
  history: Array<{ question: string; answer: string }>;
  final: boolean;
  access: boolean;
}

/**
 * Registers a new session for a user in Redis (and resets an existing session if present).
 * @param userId - The identifier for the user extracted from the token.
 */
export const registerSession = async (userId: string): Promise<void> => {
  const sessionData: SessionData = {
    history: [],
    final: false,
    access: false,
  };

  const sessionKey = `session:${userId}`;
  // Set session with an expiry of 3600 seconds (60 minutes)
  await redis.set(sessionKey, JSON.stringify(sessionData), "EX", 60 * 60);
}; 
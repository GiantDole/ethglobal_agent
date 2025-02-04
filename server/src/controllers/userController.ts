import { Request, Response } from 'express';
import { registerSession } from '../services/userService';
import logger from "../config/logger";

/**
 * Controller to register a new or existing user.
 * - Expects the JWT payload on req.user (populated by authenticateJWT middleware).
 * - Placeholder for database user registration.
 * - Registers/resets a session in Redis.
 * - Responds with a static first question.
 */
export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const userId = user?.sub || user?.id;
    if (!userId) {
      logger.warn({user}, "Register: No user id provided.");
      return res.status(400).json({ message: 'User id not found in token' });
    }

    // Placeholder: Register the user in the database if needed.
    // await registerUserInDatabase(user);

    // Create or reset the user session in Redis.
    await registerSession(userId);
    logger.info({user}, "Register: User successfully registered.");

    // Return the first question.
    return res.status(200).json({ question: 'What is your first question?' });
  } catch (error) {
    console.error('Error in registerUser controller:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}; 
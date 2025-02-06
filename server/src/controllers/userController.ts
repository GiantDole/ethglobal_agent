import { Request, Response } from 'express';
import { createUserWithAccounts, registerSession, userExistsWithPrivyId } from '../services/userService';
import logger from "../config/logger";
import { privyService } from '../services/privyServiceSingleton';

/**
 * Controller to register a new or existing user.
 * This endpoint will:
 *  - Verify the access token via Privy.
 *  - Retrieve user details from the identity token.
 *  - Register (or reset) a session.
 *  - Respond with a static message.
 */
export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check that both required cookies exist.
    if (
      !req.cookies ||
      !req.cookies['privy-token'] ||
      !req.cookies['privy-id-token']
    ) {
      logger.warn("Unauthorized: Missing required cookies");
      return res.status(401).json({ error: 'Unauthorized: Missing required cookies' });
    }

    // Verify and extract user information.
    const authTokenClaims = await privyService.verifyAccessToken(req);
    const userInfo = await privyService.getUserFromIdentityToken(req);
    const userId = userInfo.id;
    if (!userId) {
      logger.warn({ authTokenClaims, userInfo }, "Register: No user id found in token.");
      return res.status(400).json({ error: 'User id not found in token' });
    }

    // Register or reset the user's session.
    await registerSession(userId);
    logger.info({ user: userId, wallet: userInfo.wallet }, "Register: User session successfully registered.");

    // Create the user in Supabase if they don't exist.
    const exists = await userExistsWithPrivyId(userId);
    if (!exists) {
      await createUserWithAccounts(userInfo);
    }

    return res.status(200).json({ message: 'User registered successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error in registerUser controller: ${errorMessage}`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}; 
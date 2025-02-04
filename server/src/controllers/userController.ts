import { Request, Response } from 'express';
import { registerSession } from '../services/userService';
import logger from "../config/logger";

/**
 * Controller to register a new or existing user.
 * This endpoint will:
 *  - Verify the access token using Privy's verification via PrivyService.
 *  - Retrieve user details using the identity token.
 *  - Register (or reset) a session with the returned user information.
 *  - Respond with a static first question.
 */
export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get Privy configuration from environment variables.
    if(!req.cookies) {
      return res.status(401).json({ message: 'Unauthorized: Missing cookies' });
    }
    const appId = process.env.PRIVY_APP_ID;
    const verificationKey = process.env.PRIVY_VERIFICATION_KEY;
    if (!appId || !verificationKey) {
      logger.error("Missing Privy configuration (PRIVY_APP_ID or PRIVY_VERIFICATION_KEY).");
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Instantiate the PrivyService.
    const privyService = new (require('../services/privyService').PrivyService)({ appId, verificationKey });
    
    // Verify the access token provided in the request.
    const authTokenClaims = await privyService.verifyAccessToken(req);
    console.log(authTokenClaims);

    // Retrieve user information using the identity token.
    const userInfo = await privyService.getUserFromIdentityToken(req);
    console.log(userInfo);

    // Extract user id from the token claims and/or user information.
    const userId = authTokenClaims.sub || userInfo.id;
    if (!userId) {
      logger.warn({ authTokenClaims, userInfo }, "Register: No user id found in token.");
      return res.status(400).json({ message: 'User id not found in token' });
    }

    // Register or reset the user session (e.g., in Redis).
    await registerSession(userId);
    logger.info({ user: userInfo }, "Register: User session successfully registered.");

    // Respond with a static question.
    return res.status(200).json({ question: 'What is your first question?' });
  } catch (error) {
    logger.error(error, "Error in registerUser controller:");
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}; 
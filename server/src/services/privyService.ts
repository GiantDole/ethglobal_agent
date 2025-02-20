/**
 * PrivyService interacts with Privy's authentication and user endpoints.
 *
 * It provides methods for:
 * - Verifying access tokens with your app's verification key.
 * - Querying a user using their identity token.
 *
 * For more details, see:
 * - [Access Token Verification](https://docs.privy.io/guide/server/authorization/verification)
 * - [Querying a Single User](https://docs.privy.io/guide/server/users/get)
 */

import { Request } from 'express';
import { PrivyClient, AuthTokenClaims } from '@privy-io/server-auth';
import logger from "../config/logger";

export interface PrivyServiceConfig {
  appId: string;
  verificationKey: string;
}

export class PrivyService {
  private client: PrivyClient;

  constructor(config: PrivyServiceConfig) {
    this.client = new PrivyClient(config.appId, config.verificationKey);
  }

  /**
   * Verifies the provided access token against Privy's verification key.
   *
   * @param accessToken - The user's access token (JWT)
   * @returns A promise that resolves to the token's claims if verification is successful.
   *
   * @throws An error if the token cannot be verified.
   *
   * @see [Access Token Verification](https://docs.privy.io/guide/server/authorization/verification)
   */
  async verifyAccessToken(req: Request): Promise<AuthTokenClaims> {
    try {
      const accessToken = req.cookies['privy-token'];
      if (!accessToken) {
        throw new Error("No valid privy-token cookie found.");
      }
      return await this.client.verifyAuthToken(accessToken);
    } catch (error) {
      throw new Error(`Access token verification failed: ${error}`);
    }
  }

  /**
   * Retrieves user information using the provided identity token.
   *
   * @param idToken - The identity token (typically provided as a cookie) that includes lightweight user data.
   * @returns A promise that resolves to the parsed User object.
   *
   * @throws An error if the identity token is invalid or user retrieval fails.
   *
   * @see [Querying a Single User](https://docs.privy.io/guide/server/users/get)
   */
  async getUserFromIdentityToken(req: Request): Promise<any> {
    try {
      const idToken = req.cookies['privy-id-token'];
      
      if (!idToken) {
        logger.error('Missing privy-id-token cookie');
        throw new Error("No valid privy-id-token cookie found.");
      }
      const user = await this.client.getUser({ idToken });
      return user;
    } catch (error) {
      logger.error('getUserFromIdentityToken failed:', { error });
      throw new Error(`Failed to retrieve user from identity token: ${error}`);
    }
  }

  async getUserIdFromAccessToken(req: Request): Promise<any> {
    try {
      const user = await this.getUserFromIdentityToken(req);
      return user.id;
    } catch (error) {
      logger.error('getUserIdFromAccessToken failed:', { error });
      throw new Error(`Failed to retrieve user ID: ${error}`);
    }
  }
}

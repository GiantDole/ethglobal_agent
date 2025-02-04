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

import type { NextApiRequest } from 'next';
import { PrivyClient, AuthTokenClaims } from '@privy-io/server-auth';

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
  async verifyAccessToken(req: NextApiRequest): Promise<AuthTokenClaims> {
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
  async getUserFromIdentityToken(req: NextApiRequest): Promise<any> {
    try {
      const idToken = req.cookies['idToken'];
      if (!idToken) {
        throw new Error("No valid idToken cookie found.");
      }
      const user = await this.client.getUser({ idToken });
      return user;
    } catch (error) {
      throw new Error(`Failed to retrieve user from identity token: ${error}`);
    }
  }
}

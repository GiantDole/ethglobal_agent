import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';

dotenv.config();

// Configure the JWKS client for Privy.
// Replace `YOUR_PRIVY_JWKS_URI` with the actual JWKS URL provided by Privy.
const client = jwksClient({
  jwksUri: process.env.PRIVY_JWKS_URI || 'https://privy.example.com/.well-known/jwks.json',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // cache for 10 minutes
});

// Function to retrieve the signing key from JWKS endpoint
const getKey = (header: any, callback: any) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err || new Error('Unable to retrieve signing key'), null);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
};

/**
 * Middleware to validate JWTs provided in the Authorization header.
 * Expects the header to follow the format: "Authorization: Bearer <token>".
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      res.status(403).json({ message: 'Forbidden: Invalid token' });
      return;
    }
    
    // Optionally, attach the decoded token to the request object
    (req as any).user = decoded;
    next();
  });
}; 
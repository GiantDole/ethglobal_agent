import { PrivyService } from './privyService';

const appId = process.env.PRIVY_APP_ID;
const verificationKey = process.env.PRIVY_VERIFICATION_KEY;

if (!appId || !verificationKey) {
  throw new Error("Missing Privy configuration (PRIVY_APP_ID or PRIVY_VERIFICATION_KEY).");
}

export const privyService = new PrivyService({ appId, verificationKey }); 
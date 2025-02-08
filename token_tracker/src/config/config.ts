import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  rpcUrl: z.string().url(),
  chainId: z.number(),
  supabaseUrl: z.string().url(),
  supabaseKey: z.string(),
  pollingInterval: z.number().min(1000),
});

const config = {
  rpcUrl: process.env.RPC_URL,
  chainId: Number(process.env.CHAIN_ID),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  pollingInterval: Number(process.env.POLLING_INTERVAL),
};

export default configSchema.parse(config);
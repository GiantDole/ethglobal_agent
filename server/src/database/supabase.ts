import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// It's a good practice to load environment variables and ensure they exist.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables.');
}

// Create a single instance of the client.
// This follows the singleton pattern so that all modules share the same instance.
const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  // You can pass additional configuration options here if needed, such as:
  // schema: 'public',
  // headers: { 'x-my-custom-header': 'my-app' },
});

export default supabaseClient;

import { createClient } from '@supabase/supabase-js';
import config from '../config/config';
import logger from '../config/logger';
import type { Database } from '../types/supabase_types';

type Project = Database['public']['Tables']['Projects']['Row'];
type TokenPrice = Database['public']['Tables']['TokenPrices']['Insert'];

class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseKey);
  }

  async getActiveTokens(): Promise<Project[]> {
    try {
      const { data, error } = await this.supabase
        .from('Projects')
        .select('*')
        .eq('status', 1);  // Assuming status 1 means active

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching active tokens:', error);
      return [];
    }
  }

  async insertPriceData(priceData: TokenPrice): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('TokenPrices')
        .insert([priceData]);

      if (error) throw error;
    } catch (error) {
      logger.error(`Error inserting price data for project ${priceData.project_id}:`, error);
    }
  }
}

export default new DatabaseService();
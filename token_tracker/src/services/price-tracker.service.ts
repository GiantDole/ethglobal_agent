import type { Database } from '../types/supabase_types';
import databaseService from './database.service';
import blockchainService from './blockchain.service';
import logger from '../config/logger';
import config from '../config/config';

type Project = Database['public']['Tables']['Projects']['Row'];

class PriceTracker {
  private activeProjects: Map<number, Project> = new Map();
  private trackers: Map<number, NodeJS.Timeout> = new Map();

  async start(): Promise<void> {
    logger.info('Starting price tracker service...');
    await this.updateActiveProjects();
    // Check for project changes every minute
    setInterval(() => this.updateActiveProjects(), 60000);
    logger.info('Price tracker service started successfully');
  }

  private async updateActiveProjects(): Promise<void> {
    try {
      logger.debug('Updating active projects...');
      const projects = await databaseService.getActiveTokens();
      logger.info(`Found ${projects.length} active projects`);
      const currentProjectIds = new Set(this.activeProjects.keys());
      const newProjectIds = new Set(projects.map(p => p.id));

      // Stop tracking removed projects
      for (const projectId of currentProjectIds) {
        if (!newProjectIds.has(projectId)) {
          this.stopTracking(projectId);
        }
      }

      // Start tracking new projects
      for (const project of projects) {
        if (!currentProjectIds.has(project.id) && project.token_address) {
          this.startTracking(project);
        }
      }

      this.activeProjects = new Map(projects.map(project => [project.id, project]));
    } catch (error) {
      logger.error('Error updating active projects:', error);
    }
  }

  private startTracking(project: Project): void {
    if (!project.token_address) {
      logger.warn(`Project ${project.name} (${project.id}) has no token address`);
      return;
    }
    
    logger.info(`Starting price tracking for project ${project.name} (${project.token_address})`);
    
    const interval = setInterval(async () => {
      try {
        const price = await blockchainService.getTokenPrice(project.token_address!);
        
        await databaseService.insertPriceData({
          project_id: project.id,
          price,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        logger.error(`Error tracking price for project ${project.name}:`, error);
      }
    }, config.pollingInterval);

    this.trackers.set(project.id, interval);
  }

  private stopTracking(projectId: number): void {
    const interval = this.trackers.get(projectId);
    if (interval) {
      clearInterval(interval);
      this.trackers.delete(projectId);
      const project = this.activeProjects.get(projectId);
      logger.info(`Stopped tracking project ${project?.name || projectId}`);
    }
  }
}

export default new PriceTracker();
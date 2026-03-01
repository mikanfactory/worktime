// Legacy compatibility layer - delegates to DatabaseService
import { databaseService } from './DatabaseService'

export async function initializeDatabase(): Promise<void> {
  await databaseService.initialize()
}

// Export the service for direct access
export { databaseService }

import { z } from 'zod';
import type { McpServer } from '../mcp/server.js';
import promptsService from '../services/promptsService.js';

export function registerPrompts(server: McpServer) {
  // promptsService has already registered the default prompts in its constructor
  // No additional registration needed here as the McpServer now delegates to promptsService
  
  // We could add any game-specific registration logic here if needed
}
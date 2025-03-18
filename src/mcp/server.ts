import { EventEmitter } from 'events';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  ToolDefinition,
  ToolResult,
  PromptDefinition,
  PromptResult,
  ResourceDefinition,
  ResourceResult,
  McpContext,
} from '../types/mcp.js';
import stateService from '../services/stateService.js';
import toolsService from '../services/toolsService.js';
import promptsService from '../services/promptsService.js';

export type ToolHandler = (params: Record<string, unknown>, context: McpContext) => Promise<ToolResult>;
export type PromptHandler = (params: Record<string, unknown>, context: McpContext) => Promise<PromptResult>;
export type ResourceHandler = (uri: string, params: Record<string, unknown>, context: McpContext) => Promise<ResourceResult>;
export type MessageSender = (message: any) => Promise<void>;

export class McpServer extends EventEmitter {
  private options: {
    name: string;
    version: string;
    description?: string;
  };
  private transportSend?: MessageSender;
  private resources: Map<string, { definition: ResourceDefinition; handler: ResourceHandler }> = new Map();

  constructor(options: {
    name: string;
    version: string;
    description?: string;
  }) {
    super();
    this.options = options;

    // Listen for state changes
    stateService.on('TOOLS_CHANGED', async ({ playerId }) => {
      await this.notifyToolsChanged(playerId);
    });

    stateService.on('PROMPTS_CHANGED', async ({ playerId }) => {
      await this.notifyPromptsChanged(playerId);
    });
  }

  private async notifyToolsChanged(playerId: string): Promise<void> {
    if (!this.transportSend) return;

    // console.log(`[MCP] Notifying tools changed for player: ${playerId}`);
    
    const availableTools = toolsService.getAvailableTools(playerId);
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/tools/list_changed',
      params: {
        tools: availableTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters 
            ? { type: 'object', properties: tool.parameters, required: [] }
            : { }
        }))
      }
    };
    
    await this.sendMessage(notification);
  }

  private async notifyPromptsChanged(playerId: string): Promise<void> {
    if (!this.transportSend) return;
    
    const playerState = stateService.getPlayerState(playerId);
    if (!playerState) return;

    // Use promptsService to get available prompts based on player state
    const availablePrompts = promptsService.getAvailablePrompts(playerId);

    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/prompts/list_changed',
      params: {
        prompts: availablePrompts
      }
    };
    
    await this.sendMessage(notification);
  }

  // Set the transport send method
  public setTransportSend(sender: MessageSender): void {
    // console.log('[MCP] Setting transport send method');
    this.transportSend = sender;
    
    // Now that we have a transport send method, publish our initial lists
    this.publishInitialLists();
  }

  // Unified message sending method
  private async sendMessage(message: any): Promise<void> {
    if (!this.transportSend) {
      // console.log('[MCP] Cannot send message - no transport send method');
      return;
    }

    try {
      // console.log(`[MCP] Sending message: ${JSON.stringify(message)}`);
      await this.transportSend(message);
    } catch (error) {
      // console.log(`[MCP] Error sending message:`, error);
    }
  }

  private async publishInitialLists(): Promise<void> {
    // Create a session without passing a parameter
    const session = stateService.createSession();
    const defaultPlayerId = session.playerId;
    
    // console.log('[MCP] Publishing initial tool, prompt, and resource lists');
    
    // Simulate state changes to trigger notifications
    await this.notifyToolsChanged(defaultPlayerId);
    await this.notifyPromptsChanged(defaultPlayerId);
  }

  public async handleRequest(request: any): Promise<any> {
    try {
      const { method, params = {}, id } = request;

      // For all non-initialize requests, ensure we have a valid session
      if (method !== 'initialize' && method !== 'ping') {
        // Get session ID from params or create new session
        const sessionId = params.sessionId || 'default';
        let session = stateService.getSession(sessionId);
        
        // Create session if it doesn't exist
        if (!session) {
          session = stateService.createSession();
          // Store session ID in transport for future requests
          if (this.transportSend) {
            const adapter = this.transportSend as any;
            if (adapter.setSessionId) {
              adapter.setSessionId(session.id);
            }
          }
        }

        // Add session to context
        params.sessionId = session.id;
      }

      const context: McpContext = {
        sessionId: params.sessionId,
        transport: params.transport
      };

      let playerState: any = null;
      let session: any = null;

      switch (method) {
        case 'initialize':
          session = stateService.createSession();

          // console.log('[MCP] Processing initialize request');
          toolsService.registerDefaultTools();
          playerState = stateService.getPlayerState(session.id);
          // Notification Issue https://github.com/orgs/modelcontextprotocol/discussions/76
          stateService.emit('TOOLS_CHANGED', { playerId: playerState?.player_id});
          // According to the MCP protocol specification 2024-11-05
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {
                  listChanged: true
                },
                prompts: {
                  listChanged: true
                },
                resources: {
                  listChanged: true,
                  subscribe: true
                }
              },
              serverInfo: {
                name: this.options.name,
                version: this.options.version,
                description: this.options.description || ''
              },
              session: {
                id: session.id
              },
              // Add instructions to help the client understand our server
              instructions: "This MUD server provides tools for exploring a text-based adventure. Use 'look' to examine your surroundings, 'move' to navigate between rooms, and 'pick_up' to collect items."
            }
          };

        case 'tools/list':
          // console.log('[MCP] Processing tools/list request');
          session = stateService.getSession(params.sessionId);
          playerState = stateService.getPlayerState(session.playerId);
          if (!playerState) {
            throw new Error(`Session '${params.sessionId}' not found`);
          }
          const availableTools = toolsService.getAvailableTools(playerState?.player_id);
          // console.log(`[MCP] Available tools: ${availableTools.map(tool => tool.name).join(', ')}`);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: availableTools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.parameters
                  ? { type: 'object', properties: 
                    tool.parameters, required: [] }
                  : { type: 'object' }
              }))
            }
          };

        case 'tools/call': {
          // console.log(`[MCP] Processing tools/call request for ${params.name}`);
          const { name, arguments: inputArgs = {} } = params as { name: string; arguments: Record<string, unknown> };
          session = stateService.getSession(params.sessionId);
          playerState = stateService.getPlayerState(session.playerId);
          if (!playerState) {
            throw new Error(`Session '${params.sessionId}' not found`);
          }
          const availableTools = toolsService.getAvailableTools(playerState?.player_id);
          const tool = availableTools.find(tool => tool.name === name);
          if (!tool) {
            throw new Error(`Tool '${name}' not found`);
          }
          const toolCallResult  = await tool.execute(inputArgs, context);
          
          return {
            jsonrpc: '2.0',
            id,
            result: toolCallResult
          };
        }

        case 'prompts/list':
          // console.log('[MCP] Processing prompts/list request');
          session = stateService.getSession(params.sessionId);
          playerState = stateService.getPlayerState(session?.playerId);
          
          if (!playerState) {
            throw new Error(`Session '${params.sessionId}' not found`);
          }
          
          const availablePrompts = promptsService.getAvailablePrompts(playerState.player_id);
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: availablePrompts.map(definition => ({
                name: definition.name,
                description: definition.description,
                arguments: definition.parameters ? Object.entries(definition.parameters)
                .map(([field, parameter]) => ({
                  name: parameter.name,
                  description: parameter.description,
                  type: parameter.type,
                  required: parameter.required,
                })) : []
              }))
            }
          };

        case 'prompts/get': {
          // console.log(`[MCP] Processing prompts/get request for ${params.name}`);
          const { name, arguments: inputArgs = {} } = params as { name: string; arguments: Record<string, unknown> };
          
          // Use promptsService to execute the prompt
          const result = await promptsService.executePrompt(name, inputArgs, context);
          
          return {
            jsonrpc: '2.0',
            id,
            result
          };
        }

        case 'resources/list':
          // console.log('[MCP] Processing resources/list request');
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: Array.from(this.resources.values()).map(({ definition }) => ({
                uri: definition.uriPattern,
                name: definition.name || definition.uriPattern,
                description: definition.description || ''
              }))
            }
          };

        case 'resources/read': {
          // console.log(`[MCP] Processing resources/read request for ${params.uri}`);
          const { uri, parameters: inputParams = {} } = params as { uri: string; parameters: Record<string, unknown> };
          const resource = this.resources.get(uri);
          if (!resource) {
            throw new Error(`Resource '${uri}' not found`);
          }
          
          const validatedParams: Record<string, unknown> = {};
          if (resource.definition.parameters) {
            for (const [key, schema] of Object.entries(resource.definition.parameters)) {
              validatedParams[key] = schema.parse(inputParams[key]);
            }
          }
          
          const result = await resource.handler(uri, validatedParams, context);
          return {
            jsonrpc: '2.0',
            id,
            result
          };
        }

        case 'ping':
          // console.log('[MCP] Processing ping request');
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };

        case 'notifications/initialized': {
          // console.log('[MCP] Received initialized notification');
          // Client is now ready, we can send our tool/prompt/resource notifications
          this.publishInitialLists();
          // No response needed for notifications
          return null;
        }

        default:
          // console.log(`[MCP] Unknown method: ${method}`);
          throw new Error(`Method '${method}' not found`);
      }
    } catch (error) {
      // console.log(`[MCP] Error handling request:`, error);
      throw error;
    }
  }

  public async executeCommand(name: string, params: Record<string, unknown>, context: McpContext): Promise<ToolResult> {
    return {} as ToolResult; // Placeholder for actual command execution logic
  }

  registerTool(definition: ToolDefinition, handler: ToolHandler): void {
    // This functionality is now handled by toolsService
  }

  removeTool(name: string): void {
    // This functionality is now handled by toolsService
  }

  registerPrompt(definition: PromptDefinition, handler: PromptHandler): void {
    // Delegate to the promptsService
    promptsService.registerPrompt(definition, handler);
  }

  removePrompt(name: string): void {  
    // Delegate to the promptsService
    promptsService.removePrompt(name);
    // Notify clients of prompt list change
    stateService.emit('PROMPTS_CHANGED', { playerId: 'all' });
  }

  registerResource(definition: ResourceDefinition, handler: ResourceHandler): void {
    if (!definition.uriPattern && !definition.name) {
      throw new Error('Resource must have either uriPattern or name defined');
    }
    const resourceKey = definition.uriPattern || definition.name as string;
    // console.log(`[MCP] Registering resource: ${resourceKey}`);
    this.resources.set(resourceKey, { definition, handler });
  }

  close(): void {
    // console.log('[MCP] Closing server');
  }
}
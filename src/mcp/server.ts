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
  CreateMessageRequest,
  CreateMessageResult,
  SamplingHandler,
} from '../types/mcp.js';
import type { Prompt } from '../types/index.js';
import stateService from '../services/stateService.js';
import toolsService from '../services/toolsService.js';
import promptsService from '../services/promptsService.js';
import samplingService from '../services/samplingService.js';
import { initializeLogging, logToFile } from '../config/system.js';

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
  private clientCapabilities: Record<string, any> = {};

  constructor(options: {
    name: string;
    version: string;
    description?: string;
  }) {
    super();
    this.options = options;

    // Initialize logging system
    initializeLogging();

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

    logToFile(`[Notify] Tools changed for player: ${playerId}`, 'mcp-server.log');

    const availableTools = toolsService.getAvailableTools(playerId);
    
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/tools/list_changed',
      params: {
        tools: availableTools.map((tool) => {
          const toolRes: {
            name: string;
            description?: string;
            inputSchema: {
              type: "object";
              properties?: Record<string, any>;
              required?: string[];
            };
          } = {
            name: tool.name,
            description: tool.description,
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          };          if (tool.inputSchema && tool.inputSchema.properties) {
            const propertiesObj: Record<string, any> = tool.inputSchema.properties;
            
            toolRes.inputSchema = {
              type: 'object',
              properties: propertiesObj,
              required: tool.inputSchema.required || []
            };
          }

          return toolRes;
        })
      }
    };

    logToFile(`[Response] Tools notify change: ${JSON.stringify(notification)}`, 'mcp-server.log');

    await this.sendMessage(notification);
  }

  private async notifyPromptsChanged(playerId: string): Promise<void> {
    if (!this.transportSend) return;

    logToFile(`[Notify] Prompts changed for player: ${playerId}`, 'mcp-server.log');

    const playerState = stateService.getPlayerState(playerId);
    if (!playerState) return;

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
      logToFile('[Error] Cannot send message - no transport send method', 'mcp-server.log');
      return;
    }

    try {
      logToFile(`[Send] Sending message: ${JSON.stringify(message)}`, 'mcp-server.log');
      await this.transportSend(message);
    } catch (error) {
      logToFile(`[Error] Failed to send message: ${error}`, 'mcp-server.log');
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
      logToFile(`[Request] Handling request: ${JSON.stringify(request)}`, 'mcp-server.log');
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

      switch (method) {        case 'initialize':          
          session = stateService.createSession();

          // Store client capabilities for sampling support
          this.clientCapabilities = params.capabilities || {};
          
          // Set up sampling handler if client supports it
          if (this.clientCapabilities.sampling) {
            logToFile('[MCP] Client supports sampling - setting up handler', 'mcp-server.log');
            const samplingHandler: SamplingHandler = async (request: CreateMessageRequest) => {
              // Forward sampling request to client
              const samplingRequest = {
                jsonrpc: '2.0',
                id: `sampling_${Date.now()}`,
                method: 'sampling/createMessage',
                params: request
              };
              
              // This would be handled by the transport layer in a real implementation
              // For now, we'll store the handler but actual sampling calls would need
              // to be routed through the transport
              throw new Error('Sampling requests must be routed through transport layer');
            };
            
            samplingService.setSamplingHandler(samplingHandler);
          }

          // console.log('[MCP] Processing initialize request');
          // Tools are registered automatically in toolsService constructor
          playerState = stateService.getPlayerState(session.id);
          // Notification Issue https://github.com/orgs/modelcontextprotocol/discussions/76
          stateService.emit('TOOLS_CHANGED', { playerId: playerState?.player_id});
          // According to the MCP protocol specification 2025-03-26
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2025-03-26',
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
          };case 'tools/list':
          // console.log('[MCP] Processing tools/list request');
          session = stateService.getSession(params.sessionId);
          const sessionPlayerId = session?.playerId;
          const availableTools = toolsService.getAvailableTools(sessionPlayerId);
          const res = {
            jsonrpc: '2.0',
            id,
            result: {
              tools: availableTools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
              }))
            }
          };

          logToFile(`[Response] Tools list: ${JSON.stringify(res)}`, 'mcp-server.log');

          return res;

        case 'tools/call': {
          // console.log(`[MCP] Processing tools/call request for ${params.name}`);
          logToFile(`[Request] Tools call: ${JSON.stringify(params)}`, 'mcp-server.log');
          const { name, arguments: inputArgs = {} } = params as { name: string; arguments: Record<string, unknown> };
          session = stateService.getSession(params.sessionId);
          playerState = stateService.getPlayerState(session.playerId);
          if (!playerState) {
            throw new Error(`Session '${params.sessionId}' not found`);
          }
          const availableTools = toolsService.getAvailableTools(playerState.player_id);
          const tool = availableTools.find(tool => tool.name === name);
          if (!tool) {
            throw new Error(`Tool '${name}' not found`);
          }
          const toolCallResult = await toolsService.executeTool(name, inputArgs, context);
          
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
            result: {              prompts: availablePrompts.map(definition => ({
                name: definition.name,
                description: definition.description,
                arguments: definition.arguments || []
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
          };        case 'notifications/initialized': {
          // console.log('[MCP] Received initialized notification');
          // Client is now ready, we can send our tool/prompt/resource notifications
          this.publishInitialLists();
          
          // Set up sampling transport now that client is ready
          if (this.clientCapabilities.sampling && this.transportSend) {
            this.setSamplingTransport(this.transportSend);
          }
          
          // No response needed for notifications
          return null;
        }

        case 'sampling/createMessage': {
          // This shouldn't happen - the server sends sampling requests, doesn't receive them
          // But we'll handle it gracefully
          logToFile('[Warning] Received sampling/createMessage - this is unexpected for a server', 'mcp-server.log');
          throw new Error('Servers send sampling requests, they do not receive them');
        }

        default:
          // Check if this is a sampling response
          if (method === 'sampling/createMessage' && id) {
            // This is a response to our sampling request
            this.handleSamplingResponse(request);
            return null;
          }
          
          // console.log(`[MCP] Unknown method: ${method}`);
          throw new Error(`Method '${method}' not found`);
      }
    } catch (error) {
      logToFile(`[Error] Error handling request: ${error}`, 'mcp-server.log');
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
    // Convert PromptDefinition to Prompt interface
    const prompt: Prompt = {
      name: definition.name,
      description: definition.description || '',
      arguments: definition.parameters ? Object.entries(definition.parameters).map(([name, param]) => ({
        name: name,
        description: param.description,
        required: param.required
      })) : []
    };
    
    // Delegate to the promptsService
    promptsService.registerPrompt(prompt, handler);
  }

  removePrompt(name: string): void {  
    // Delegate to the promptsService
    promptsService.removePrompt(name);
    // Notify clients of prompt list change
    stateService.emit('PROMPTS_CHANGED', { playerId: 'all' });
  }

  /**
   * Set up a proper sampling handler that routes requests through the transport
   */
  setSamplingTransport(transportSend: MessageSender): void {
    if (!this.clientCapabilities.sampling) {
      logToFile('[Sampling] Client does not support sampling capability', 'mcp-server.log');
      return;
    }

    const samplingHandler: SamplingHandler = async (request: CreateMessageRequest): Promise<CreateMessageResult> => {
      return new Promise(async (resolve, reject) => {
        const requestId = `sampling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logToFile(`[Sampling] Sending sampling request ${requestId}`, 'mcp-server.log');
        
        // Create the sampling request message
        const samplingRequest = {
          jsonrpc: '2.0',
          id: requestId,
          method: 'sampling/createMessage',
          params: request
        };

        // Set up a one-time listener for the response
        const responseHandler = (response: any) => {
          if (response.id === requestId) {
            this.off('sampling-response', responseHandler);
            
            if (response.error) {
              logToFile(`[Sampling] Error in response ${requestId}: ${response.error.message}`, 'mcp-server.log');
              reject(new Error(response.error.message));
            } else {
              logToFile(`[Sampling] Received response ${requestId}`, 'mcp-server.log');
              resolve(response.result);
            }
          }
        };

        this.on('sampling-response', responseHandler);

        // Set up timeout
        const timeout = setTimeout(() => {
          this.off('sampling-response', responseHandler);
          reject(new Error('Sampling request timed out'));
        }, 30000); // 30 second timeout

        try {
          await transportSend(samplingRequest);
        } catch (error) {
          this.off('sampling-response', responseHandler);
          clearTimeout(timeout);
          reject(error);
        }
      });
    };

    samplingService.setSamplingHandler(samplingHandler);
    logToFile('[Sampling] Transport handler configured', 'mcp-server.log');
  }

  /**
   * Handle a sampling response from the client
   */
  handleSamplingResponse(response: any): void {
    this.emit('sampling-response', response);
  }

  /**
   * Get the sampling service for use in tools and other components
   */
  getSamplingService() {
    return samplingService;
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
    logToFile('[Close] Closing server', 'mcp-server.log');
    // console.log('[MCP] Closing server');
  }
}
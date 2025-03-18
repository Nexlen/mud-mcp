import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerResources } from './game/resources.js';
import { McpServer } from './mcp/server.js';
import { TransportAdapter } from './mcp/transport-adapter.js';
import type { McpRequest, McpResponse, McpNotification } from './types/mcp.js';

async function main() {
  try {

    // Create our MCP server
    const server = new McpServer({
      name: 'MUD MCP Server',
      version: '1.0.0',
      description: 'A text-based dungeon adventure game'
    });

    // Register game components
    
    registerResources(server);

    // Create transport with our adapter
    // console.log('Creating SDK transport...');
    const sdkTransport = new StdioServerTransport();
    const transport = new TransportAdapter(sdkTransport);
    
    // Set up message handling
    transport.onMessage((message) => {
      // Only handle request messages that have an ID
      if ('id' in message) {
        const request = message as McpRequest;
        if (!request.params) {
          request.params = {};
        }
        
        request.params.sessionId = 'session_1234';
        
        server.handleRequest(request)
          .then(response => {
            if (response) {
              return transport.send(response);
            }
          })
          .catch(error => {
            // console.log('[SDK] Error processing request:', error);
            const errorResponse: McpResponse = {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32000,
                message: error instanceof Error ? error.message : 'Unknown error',
              }
            };
            return transport.send(errorResponse);
          });
      } else {
        const notification = message as McpNotification;
        // console.log('[SDK] Notification received:', notification);
        transport.send(notification);
      }
    });
    
    // Set up server's transport sender
    server.setTransportSend((message) => {
      // console.log(`[Server] Sending message:`, message);
      return transport.send(message);
    });
    
    // Start the transport
    // console.log('Starting transport...');
    await transport.start();
    // console.log('MUD MCP Server is running');

    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    // console.log('Startup error:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  // console.log('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  // console.log('Unhandled rejection:', error);
  process.exit(1);
});

main().catch(error => {
  // console.log('Fatal error:', error);
  process.exit(1);
});
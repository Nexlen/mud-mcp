import { EventEmitter } from 'events';
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpRequest, McpResponse, McpNotification } from '../types/mcp.js';
import type { JSONRPCMessage, JSONRPCRequest, JSONRPCError, JSONRPCResponse, JSONRPCNotification } from '@modelcontextprotocol/sdk/types.js';

export class TransportAdapter extends EventEmitter {
  private sdkTransport: StdioServerTransport;
  private messageBuffer: string = '';
  private sessionId?: string;

  constructor(sdkTransport: StdioServerTransport) {
    super();
    // console.log('[TransportAdapter] Initializing with SDK transport');
    this.sdkTransport = sdkTransport;

    // Set up data handler for incoming chunks
    process.stdin.on('data', (chunk: Buffer) => {
      this.handleData(chunk);
    });

    process.stdin.on('endpoint', (message: string) => {
      // console.log('[TransportAdapter] Endpoint message:', message);
    })
  }

  // Add method to get session
  public getSessionId(): string | undefined {
    return this.sessionId;
  }

  // Add method to set session
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  private handleData(chunk: Buffer): void {
    // console.log('[TransportAdapter] Processing chunk:', chunk.toString());
    
    // Append to buffer and process complete messages
    this.messageBuffer += chunk.toString('utf8');
    
    let newlineIndex: number;
    while ((newlineIndex = this.messageBuffer.indexOf('\n')) !== -1) {
      const line = this.messageBuffer.slice(0, newlineIndex);
      this.messageBuffer = this.messageBuffer.slice(newlineIndex + 1);
      
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          // console.log('[TransportAdapter] Emitting message:', message);
          this.emit('message', message);
        } catch (e) {
          // console.log('[TransportAdapter] Failed to parse message:', line, e);
        }
      }
    }
  }

  public onMessage(handler: (message: McpRequest | McpNotification) => void): void {
    // console.log('[TransportAdapter] Message handler registered');
    this.on('message', handler);
  }

  public onClose(handler: () => void): void {
    // console.log('[TransportAdapter] Close handler registered');
    this.on('close', handler);
    
    process.on('exit', () => {
      // console.log('[TransportAdapter] Process exit detected');
      this.emit('close');
    });
  }

  public async send(message: McpResponse | McpNotification): Promise<void> {
    // console.log('[TransportAdapter] Sending message:', JSON.stringify(message));
    
    if ('id' in message) {
      // It's a response
      if ('error' in message) {
        // Error response
        const errorResponse: JSONRPCError = {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: message.error.code,
            message: message.error.message,
            data: message.error.data
          }
        };
        return this.sdkTransport.send(errorResponse);
      } else {
        // Success response
        const successResponse: JSONRPCResponse = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            ...message.result as Record<string, unknown>,
            _meta: {}
          }
        };
        return this.sdkTransport.send(successResponse);
      }
    } else {
      // It's a notification
      const notification: JSONRPCNotification = {
        jsonrpc: "2.0",
        method: message.method,
        params: message.params
      };
      return this.sdkTransport.send(notification);
    }
  }

  public async start(): Promise<void> {
    // console.log('[TransportAdapter] Starting transport');
    return this.sdkTransport.start();
  }

  public async close(): Promise<void> {
    // console.log('[TransportAdapter] Closing transport');
    await this.sdkTransport.close();
    this.emit('close');
  }
}
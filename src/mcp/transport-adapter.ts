import { EventEmitter } from 'events';
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpRequest, McpResponse, McpNotification } from '../types/mcp.js';
import type { JSONRPCMessage, JSONRPCRequest, JSONRPCError, JSONRPCResponse, JSONRPCNotification } from '@modelcontextprotocol/sdk/types.js';
import { initializeLogging, logToFile } from '../config/system.js';

export class TransportAdapter extends EventEmitter {
  private sdkTransport: StdioServerTransport;
  private messageBuffer: string = '';
  private sessionId?: string;

  constructor(sdkTransport: StdioServerTransport) {
    super();
    this.sdkTransport = sdkTransport;

    // Initialize logging system
    initializeLogging();

    // Set up data handler for incoming chunks
    process.stdin.on('data', (chunk: Buffer) => {
      logToFile(`[Data] Received chunk: ${chunk.toString()}`, 'transport-adapter.log');
      this.handleData(chunk);
    });

    process.stdin.on('endpoint', (message: string) => {
      logToFile(`[Endpoint] ${message}`, 'transport-adapter.log');
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
    this.messageBuffer += chunk.toString('utf8');
    
    let newlineIndex: number;
    while ((newlineIndex = this.messageBuffer.indexOf('\n')) !== -1) {
      const line = this.messageBuffer.slice(0, newlineIndex);
      this.messageBuffer = this.messageBuffer.slice(newlineIndex + 1);
      
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.emit('message', message);
        } catch (e) {
          logToFile(`[Error] Failed to parse message: ${line}, Error: ${e}`, 'transport-adapter.log');
        }
      }
    }
  }

  public onMessage(handler: (message: McpRequest | McpNotification) => void): void {
    this.on('message', handler);
  }

  public onClose(handler: () => void): void {
    this.on('close', handler);

    process.on('exit', () => {
      logToFile('[Exit] Process exit detected', 'transport-adapter.log');
      this.emit('close');
    });
  }

  public async send(message: McpResponse | McpNotification): Promise<void> {
    logToFile(`[Send] Sending message: ${JSON.stringify(message)}`, 'transport-adapter.log');
    
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
    logToFile('[Start] Starting transport', 'transport-adapter.log');
    try {
      return this.sdkTransport.start();
    } catch (error) {
      logToFile(`[Error] Failed to start transport: ${error}`, 'transport-adapter.log');
      throw error;
    }
  }

  public async close(): Promise<void> {
    logToFile('[Close] Closing transport', 'transport-adapter.log');
    await this.sdkTransport.close();
    this.emit('close');
  }
}
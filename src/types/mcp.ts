import { z } from 'zod';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Base JSON-RPC 2.0 message
interface JsonRpcMessage {
  jsonrpc: '2.0';
}

// Request message types
export interface McpRequest extends JsonRpcMessage {
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

// Response message types
export interface McpSuccessResponse extends JsonRpcMessage {
  id: string | number;
  result: unknown;
}

export interface McpErrorResponse extends JsonRpcMessage {
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type McpResponse = McpSuccessResponse | McpErrorResponse;

// Notification message type (no id field)
export interface McpNotification extends JsonRpcMessage {
  method: string;
  params?: Record<string, unknown>;
}

// Server configuration
export interface McpServerOptions {
  name: string;
  version: string;
  description?: string;
}

// Context for request handlers
export interface McpContext {
  transport: StdioServerTransport | null;
  sessionId?: string;
}

// Tool related types
export interface ToolParameter {
  description: string;
  required: boolean;
  type: string;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: z.ZodObject<any>;
  required?: [string];
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, ToolParameter>;
  execute: (playerId: string, params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// Prompt related types
export interface PromptParameter {
  name: string;
  description: string;
  required: boolean;
  type: string;
}

export interface PromptDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, PromptParameter>;
}

export interface PromptResult {
  messages: Array<{
    role: string;
    content: { type: string; text: string };
  }>;
}

// Resource related types
export interface ResourceParameter {
  description: string;
  required: boolean;
  type: string;
}

export interface ResourceDefinition {
  name?: string;
  uriPattern: string;
  description?: string;
  parameters?: Record<string, z.ZodType<any>>;
}

export interface ResourceResult {
  contents: Array<{
    uri: string;
    text: string;
  }>;
}

// Sampling related types
export interface SamplingMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image' | 'audio';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

export interface ModelPreferences {
  hints?: Array<{ name?: string }>;
  costPriority?: number; // 0-1
  speedPriority?: number; // 0-1
  intelligencePriority?: number; // 0-1
}

export interface CreateMessageRequest {
  messages: SamplingMessage[];
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
  modelPreferences?: ModelPreferences;
}

export interface CreateMessageResult {
  model: string;
  role: 'assistant';
  content: {
    type: 'text' | 'image' | 'audio';
    text?: string;
    data?: string;
    mimeType?: string;
  };
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens' | 'error';
}

export type SamplingHandler = (request: CreateMessageRequest) => Promise<CreateMessageResult>;
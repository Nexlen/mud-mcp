/**
 * MUD MCP Server Types
 */

import { McpContext } from "./mcp.js";

// JSON-RPC Types
export interface JsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JsonRpcNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

// Game State Types
export interface PlayerState {
  player_id: string;
  room: string;
  inventory: string[];
  hasQuest: boolean;
  monsterPresent: boolean;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  exits: {
    [direction: string]: string;  // direction: roomId
  };
  items: string[];
  monsters: string[];
  hasQuest: boolean;
}

export interface GameWorld {
  rooms: { [roomId: string]: Room };
  players: { [playerId: string]: PlayerState };
}

export interface Item {
  name: string;
  description: string;
}

export interface Monster {
  name: string;
  description: string;
  health: number;
  damage: number;
}

export interface Quest {
  title: string;
  description: string;
  reward: string;
}

// Session Management
export interface Session {
  id: string;
  playerId: string;
  lastActive: Date;
}

// Events
export type GameEvent = 
  | { type: 'PLAYER_MOVED', playerId: string, from: string, to: string }
  | { type: 'ITEM_PICKED', playerId: string, item: string }
  | { type: 'BATTLE_STARTED', playerId: string, monster: string }
  | { type: 'BATTLE_WON', playerId: string, monster: string }
  | { type: 'BATTLE_LOST', playerId: string, monster: string }
  | { type: 'QUEST_ACCEPTED', playerId: string }
  | { type: 'TOOLS_CHANGED', playerId: string }
  | { type: 'PROMPTS_CHANGED', playerId: string };

// Tool Types
export interface Tool {
  name: string;
  description: string;
  parameters?: {
    [paramName: string]: {
      description: string;
      required: boolean;
      type: string;
    };
  };
  execute: (params: Record<string, unknown>, context: McpContext) => Promise<ToolResponse>;
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

// Prompt Types
export interface Prompt {
  name: string;
  description: string;
  isAvailable: (playerState: PlayerState) => boolean;
  generate: (playerState: PlayerState) => Promise<PromptResponse>;
}

export interface PromptResponse {
  messages: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
}

// Connection Types
export interface Connection {
  id: string;
  playerId: string;
  send: (data: JsonRpcResponse | JsonRpcNotification) => void;
}
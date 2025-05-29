import { EventEmitter } from 'events';
import type { Tool, ToolResponse } from '../types/index.js';
import stateService from './stateService.js';
import { items, monsters } from '../config/world.js';
import { McpContext, ToolResult } from '../types/mcp.js';

interface ToolParameters {
  [key: string]: any;
}

interface ToolError extends Error {
  message: string;
}

/**
 * Tools Service
 * 
 * Implements the game actions (tools) available to players
 * Updated for MCP 2025-03-26 specification compliance
 */
class ToolsService extends EventEmitter {
  private tools: { [name: string]: Tool } = {};
  private toolHandlers: { [name: string]: (params: Record<string, unknown>, context: McpContext) => Promise<ToolResult> } = {};
  
  constructor() {
    super();
    this.registerDefaultTools();
  }

  /**
   * Register a new tool with its handler
   */
  registerTool(tool: Tool, handler: (params: Record<string, unknown>, context: McpContext) => Promise<ToolResult>): void {
    this.tools[tool.name] = tool;
    this.toolHandlers[tool.name] = handler;
    this.emit('toolRegistered', tool.name);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(name: string, params: Record<string, unknown>, context: McpContext): Promise<ToolResult> {
    const handler = this.toolHandlers[name];
    if (!handler) {
      return {
        content: [{ type: 'text', text: `Tool '${name}' not found.` }],
        isError: true
      };
    }

    try {
      return await handler(params, context);
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error executing tool '${name}': ${error instanceof Error ? error.message : 'Unknown error'}` }],
        isError: true
      };
    }
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): Tool[] {
    return Object.values(this.tools);
  }

  // ========== TOOL HANDLERS ==========

  /**
   * Look around the current room
   */
  private lookHandler = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
    if (!context.sessionId) {
      return {
        content: [{ type: 'text', text: 'Error: Session initialization failed.' }],
        isError: true
      };
    }

    const session = stateService.getSession(context.sessionId);
    if (!session) {
      return {
        content: [{ type: 'text', text: 'Error: Invalid session. Please try again.' }],
        isError: true
      };
    }
    
    const playerState = stateService.getPlayerState(session.playerId);
    if (!playerState) {
      return {
        content: [{ type: 'text', text: 'Error: Could not find player state. Please try again.' }],
        isError: true
      };
    }
    
    const world = stateService.getWorld();
    const room = world.rooms[playerState.room];
    if (!room) {
      return {
        content: [{ type: 'text', text: 'Error: Invalid room.' }],
        isError: true
      };
    }
    
    // Get exits as a string
    const exits = Object.entries(room.exits)
      .map(([direction, roomId]) => direction.charAt(0).toUpperCase() + direction.slice(1))
      .join(', ');
    
    // Get items in the room
    const itemsText = room.items.length > 0 
      ? `\nYou see: ${room.items.map(itemId => {
          const item = items[itemId];
          return item ? item.name : itemId;
        }).join(', ')}.` 
      : '\nThere are no items here.';
    
    // Describe any monsters present
    const monsterText = playerState.monsterPresent && room.monsters.length > 0
      ? `\nA ${room.monsters.map(monsterId => {
          const monster = monsters[monsterId];
          return monster ? monster.name : monsterId;
        }).join(', ')} growls menacingly at you!` 
      : '';
    
    // Describe any quest opportunities
    const questText = room.hasQuest && !playerState.hasQuest 
      ? '\nThere is a quest available here.' 
      : '';
    
    return {
      content: [{ 
        type: 'text', 
        text: `${room.description}\n\nExits: ${exits}.${itemsText}${monsterText}${questText}` 
      }]
    };
  };

  /**
   * Move to a different room
   */
  private moveHandler = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
    try {
      if (!context.sessionId) {
        return {
          content: [{ type: 'text', text: 'Error: No session ID provided.' }],
          isError: true
        };
      }

      const session = stateService.getSession(context.sessionId);
      if (!session) {
        return {
          content: [{ type: 'text', text: 'Error: Session not found. Please restart the game.' }],
          isError: true
        };
      }

      const { direction } = params as { direction: string };
      const playerState = stateService.getPlayerState(session.playerId);
      const world = stateService.getWorld();
      
      if (!playerState) {
        return {
          content: [{ type: 'text', text: 'Error: Player state not found. Please restart the game.' }],
          isError: true
        };
      }
      
      const currentRoom = world.rooms[playerState.room];
      if (!currentRoom) {
        return {
          content: [{ type: 'text', text: 'Error: Current room not found.' }],
          isError: true
        };
      }
      
      const targetRoomId = currentRoom.exits[direction.toLowerCase()];
      if (!targetRoomId) {
        return {
          content: [{ type: 'text', text: `You can't go ${direction} from here.` }],
          isError: false
        };
      }
      
      const targetRoom = world.rooms[targetRoomId];
      if (!targetRoom) {
        return {
          content: [{ type: 'text', text: 'Error: Target room not found.' }],
          isError: true
        };
      }

      // Update player's room
      stateService.updatePlayerRoom(session.playerId, targetRoomId);
      
      return {
        content: [{ 
          type: 'text', 
          text: `You move ${direction} to ${targetRoom.name}.` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error moving: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        isError: true
      };
    }
  };

  /**
   * Check inventory
   */
  private inventoryHandler = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
    if (!context.sessionId) {
      return {
        content: [{ type: 'text', text: 'Error: Session initialization failed.' }],
        isError: true
      };
    }

    const session = stateService.getSession(context.sessionId);
    if (!session) {
      return {
        content: [{ type: 'text', text: 'Error: Invalid session. Please try again.' }],
        isError: true
      };
    }
    
    const playerState = stateService.getPlayerState(session.playerId);
    if (!playerState) {
      return {
        content: [{ type: 'text', text: 'Error: Could not find player state. Please try again.' }],
        isError: true
      };
    }
    
    if (playerState.inventory.length === 0) {
      return {
        content: [{ type: 'text', text: 'Your inventory is empty.' }]
      };
    }
    
    const itemList = playerState.inventory.map(itemId => {
      const item = items[itemId];
      return item ? item.name : itemId;
    }).join(', ');
    
    return {
      content: [{ 
        type: 'text', 
        text: `You are carrying: ${itemList}.` 
      }]
    };
  };

  /**
   * Take an item from the room
   */
  private takeHandler = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
    if (!context.sessionId) {
      return {
        content: [{ type: 'text', text: 'Error: Session initialization failed.' }],
        isError: true
      };
    }

    const session = stateService.getSession(context.sessionId);
    if (!session) {
      return {
        content: [{ type: 'text', text: 'Error: Invalid session. Please try again.' }],
        isError: true
      };
    }

    const { item } = params as { item: string };
    const playerState = stateService.getPlayerState(session.playerId);
    if (!playerState) {
      return {
        content: [{ type: 'text', text: 'Error: Could not find player state. Please try again.' }],
        isError: true
      };
    }

    const world = stateService.getWorld();
    const room = world.rooms[playerState.room];
    if (!room) {
      return {
        content: [{ type: 'text', text: 'Error: Invalid room.' }],
        isError: true
      };
    }

    // Find the item ID by name
    const itemId = Object.keys(items).find(id => 
      items[id].name.toLowerCase() === item.toLowerCase()
    );

    if (!itemId || !room.items.includes(itemId)) {
      return {
        content: [{ type: 'text', text: `There is no ${item} here to take.` }],
        isError: false
      };
    }

    // Add to inventory and remove from room
    stateService.addItemToInventory(session.playerId, itemId);
    stateService.removeItemFromRoom(playerState.room, itemId);

    return {
      content: [{ 
        type: 'text', 
        text: `You take the ${items[itemId].name}.` 
      }]
    };
  };

  /**
   * Register the default game tools with MCP 2025-03-26 compliance
   */
  private registerDefaultTools(): void {
    // Look tool - read-only operation
    this.registerTool({
      name: 'look',
      description: 'Examine your current surroundings and see what\'s available in the room.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      annotations: {
        title: 'Look Around',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    }, this.lookHandler);
    
    // Move tool - state-changing but non-destructive
    this.registerTool({
      name: 'move',
      description: 'Move to a different room in the specified direction.',
      inputSchema: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['north', 'south', 'east', 'west'],
            description: 'The direction to move (north, south, east, west)'
          }
        },
        required: ['direction']
      },
      annotations: {
        title: 'Move',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    }, this.moveHandler);
    
    // Inventory tool - read-only operation
    this.registerTool({
      name: 'inventory',
      description: 'Check your inventory contents and see what items you\'re carrying.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      annotations: {
        title: 'Check Inventory',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    }, this.inventoryHandler);

    // Take tool - state-changing operation
    this.registerTool({
      name: 'take',
      description: 'Take an item from the current room and add it to your inventory.',
      inputSchema: {
        type: 'object',
        properties: {
          item: {
            type: 'string',
            description: 'The name of the item to take'
          }
        },
        required: ['item']
      },
      annotations: {
        title: 'Take Item',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    }, this.takeHandler);
  }
}

// Create and export a singleton instance
export const toolsService = new ToolsService();
export default toolsService;

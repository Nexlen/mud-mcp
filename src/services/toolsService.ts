import { EventEmitter } from 'events';
import type { Tool, ToolResponse } from '../types/index.js';
import stateService from './stateService.js';
import samplingService from './samplingService.js';
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
   * Get all available tools based on player's current state
   */
  getAvailableTools(playerId?: string): Tool[] {
    if (!playerId) {
      // Return basic tools if no player context
      return [this.tools.look, this.tools.inventory].filter(Boolean);
    }

    const playerState = stateService.getPlayerState(playerId);
    if (!playerState) {
      return [this.tools.look, this.tools.inventory].filter(Boolean);
    }

    const world = stateService.getWorld();
    const room = world.rooms[playerState.room];
    if (!room) {
      return [this.tools.look, this.tools.inventory].filter(Boolean);
    }

    const availableTools: Tool[] = [];

    // Always available tools
    if (this.tools.look) availableTools.push(this.tools.look);
    if (this.tools.inventory) availableTools.push(this.tools.inventory);

    // Movement tools - available if there are exits
    if (Object.keys(room.exits).length > 0 && this.tools.move) {
      availableTools.push(this.tools.move);
    }

    // Take tool - available if there are items in the room
    if (room.items.length > 0 && this.tools.take) {
      availableTools.push(this.tools.take);
    }

    // Battle tool - available if there are monsters in the room
    if (room.monsters.length > 0 && this.tools.battle) {
      availableTools.push(this.tools.battle);
    }

    // Talk tool - available if sampling is supported (for NPC interactions)
    if (samplingService.isAvailable() && this.tools.talk) {
      availableTools.push(this.tools.talk);
    }

    return availableTools;
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
    const monsterText = room.monsters.length > 0
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
      }      // Update player's room
      stateService.updatePlayerRoom(session.playerId, targetRoomId);
      
      // Emit tools changed since available tools depend on room contents
      stateService.emit('TOOLS_CHANGED', { playerId: session.playerId });
      
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
    }    // Find the item ID by name
    const itemId = Object.keys(items).find(id => 
      items[id].name.toLowerCase() === item.toLowerCase()
    );

    if (!itemId || !room.items.includes(itemId)) {
      // Debug info - let's see what's actually in the room
      const availableItems = room.items.map(id => items[id]?.name || id).join(', ');
      const debugText = room.items.length > 0 
        ? `Available items in this room: ${availableItems}. Looking for: ${item}`
        : `No items in this room. Looking for: ${item}`;
      
      return {
        content: [{ 
          type: 'text', 
          text: `There is no ${item} here to take. ${debugText}` 
        }],
        isError: false
      };
    }// Add to inventory and remove from room
    stateService.addItemToInventory(session.playerId, itemId);
    stateService.removeItemFromRoom(playerState.room, itemId);

    // Emit tools changed since items in room changed
    stateService.emit('TOOLS_CHANGED', { playerId: session.playerId });

    return {
      content: [{ 
        type: 'text', 
        text: `You take the ${items[itemId].name}.` 
      }]
    };
  };

  /**
   * Battle a monster in the room
   */
  private battleHandler = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
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

    const { monster } = params as { monster: string };
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

    // Find the monster by name
    const monsterId = Object.keys(monsters).find(id => 
      monsters[id].name.toLowerCase() === monster.toLowerCase()
    );

    if (!monsterId || !room.monsters.includes(monsterId)) {
      return {
        content: [{ type: 'text', text: `There is no ${monster} here to battle.` }],
        isError: false
      };
    }

    const monsterData = monsters[monsterId];
    
    // Simple battle logic - player has 50% chance to win
    const playerWins = Math.random() > 0.5;
    
    if (playerWins) {
      // Remove monster from room
      const roomData = world.rooms[playerState.room];
      roomData.monsters = roomData.monsters.filter(id => id !== monsterId);
      
      // Update player state
      stateService.updatePlayerRoom(session.playerId, playerState.room);
      
      // Emit tools changed since monsters in room changed
      stateService.emit('TOOLS_CHANGED', { playerId: session.playerId });
      
      return {
        content: [{ 
          type: 'text', 
          text: `You successfully defeat the ${monsterData.name}! The creature falls and disappears into shadows.` 
        }]
      };
    } else {
      return {
        content: [{ 
          type: 'text', 
          text: `The ${monsterData.name} proves too strong! You retreat but remain in the room. Try again when you're ready.` 
        }]
      };
    }
  };

  /**
   * Talk to NPCs, monsters, or mystical entities using AI-powered dialogue
   */
  private talkHandler = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
    try {
      if (!context.sessionId) {
        return {
          content: [{ type: 'text', text: 'Error: Session initialization failed.' }],
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

      if (!samplingService.isAvailable()) {
        return {
          content: [{ type: 'text', text: 'AI-powered dialogue is not available. This feature requires a client that supports sampling.' }],
          isError: true
        };
      }

      const { target, message } = params as { target: string; message: string };
      const playerState = stateService.getPlayerState(session.playerId);
      const world = stateService.getWorld();
      
      if (!playerState) {
        return {
          content: [{ type: 'text', text: 'Error: Could not find player state.' }],
          isError: true
        };
      }

      const room = world.rooms[playerState.room];
      if (!room) {
        return {
          content: [{ type: 'text', text: 'Error: Invalid room.' }],
          isError: true
        };
      }

      // Build context for the AI
      const gameContext = `
Current room: ${room.description}
Items in room: ${room.items.length > 0 ? room.items.join(', ') : 'none'}
Monsters in room: ${room.monsters.length > 0 ? room.monsters.join(', ') : 'none'}
Player inventory: ${playerState.inventory.length > 0 ? playerState.inventory.join(', ') : 'empty'}
Player has quest: ${playerState.hasQuest ? 'yes' : 'no'}
`.trim();

      // Check if target is a monster in the room
      const isMonster = room.monsters.some(monsterId => {
        const monster = monsters[monsterId];
        return monster && (monster.name.toLowerCase().includes(target.toLowerCase()) || monsterId.toLowerCase().includes(target.toLowerCase()));
      });

      // Generate contextual response based on target type
      let response: string;
      
      if (isMonster) {
        // Talking to a monster
        const monsterName = room.monsters.find(monsterId => {
          const monster = monsters[monsterId];
          return monster && (monster.name.toLowerCase().includes(target.toLowerCase()) || monsterId.toLowerCase().includes(target.toLowerCase()));
        });
        
        const monster = monsterName ? monsters[monsterName] : null;
        const actualMonsterName = monster ? monster.name : target;
        
        response = await samplingService.generateNPCDialogue(
          actualMonsterName,
          message,
          `${gameContext}\n\nThe player is talking to a ${actualMonsterName} - a dangerous creature that might respond with hostility, curiosity, or unexpected wisdom depending on the approach.`
        );
      } else if (target.toLowerCase().includes('spirit') || target.toLowerCase().includes('ghost') || target.toLowerCase().includes('echo')) {
        // Talking to mystical entities
        response = await samplingService.generateNPCDialogue(
          'Ancient Spirit',
          message,
          `${gameContext}\n\nThe player is attempting to communicate with mystical forces or echoes in this ancient place. The spirit might offer cryptic wisdom, warnings, or riddles.`
        );
      } else if (target.toLowerCase().includes('wall') || target.toLowerCase().includes('stone') || target.toLowerCase().includes('room')) {
        // Talking to inanimate objects or the room itself
        response = await samplingService.generateNPCDialogue(
          'Ancient Echoes',
          message,
          `${gameContext}\n\nThe player is talking to the room itself or objects within it. Ancient magic might cause echoes or whispers to respond with memories of past events.`
        );
      } else {
        // Generic NPC or unknown target
        response = await samplingService.generateNPCDialogue(
          target,
          message,
          `${gameContext}\n\nThe player is talking to someone or something called "${target}". Respond as this entity would in the context of a fantasy adventure.`
        );
      }

      return {
        content: [{ 
          type: 'text', 
          text: `You speak to ${target}: "${message}"\n\n${response}` 
        }]
      };

    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error during conversation: ${error instanceof Error ? error.message : 'Unknown error'}. The mystical forces seem to be silent right now.` 
        }],
        isError: true
      };
    }
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
    }, this.inventoryHandler);    // Take tool - state-changing operation
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

    // Battle tool - destructive operation
    this.registerTool({
      name: 'battle',
      description: 'Engage in combat with a monster in the current room.',
      inputSchema: {
        type: 'object',
        properties: {
          monster: {
            type: 'string',
            description: 'The name of the monster to battle'
          }
        },
        required: ['monster']
      },
      annotations: {
        title: 'Battle Monster',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    }, this.battleHandler);

    // Talk tool - AI-powered NPC interactions (requires sampling)
    this.registerTool({
      name: 'talk',
      description: 'Talk to NPCs, monsters, or mystical entities using AI-powered dialogue generation.',
      inputSchema: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Who or what to talk to (monster, spirit, echo, etc.)'
          },
          message: {
            type: 'string',
            description: 'What you want to say or ask'
          }
        },
        required: ['target', 'message']
      },
      annotations: {
        title: 'Talk/Communicate',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    }, this.talkHandler);
  }
}

// Create and export a singleton instance
export const toolsService = new ToolsService();
export default toolsService;

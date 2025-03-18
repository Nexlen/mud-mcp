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
 */
class ToolsService extends EventEmitter {
  private tools: { [name: string]: Tool } = {};
  
  constructor() {
    super();
    this.registerDefaultTools();
  }

  Look = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
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

  Move = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
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

      const { direction } = params as unknown as { direction: string };
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
          content: [{ type: 'text', text: 'Error: Invalid room.' }],
          isError: true
        };
      }
      
      // Check if the direction is valid
      const nextRoomId = currentRoom.exits[direction];
      if (!nextRoomId) {
        return {
          content: [{ type: 'text', text: `You cannot go ${direction} from here.` }],
          isError: true
        };
      }
      
      // Update player's room 
      const success = stateService.movePlayer(session.playerId, direction);
      if (!success) {
        return {
          content: [{ type: 'text', text: `Could not move ${direction}.` }],
          isError: true
        };
      }
      
      // After moving, call look to show the new room description
      return await this.Look({}, context);
    } catch (error) {
      // console.log('Error in move tool:', error);
      return {
        content: [{ type: 'text', text: 'An error occurred while moving.' }],
        isError: true
      };
    }
  };

  Inventory = async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
    if (!context.sessionId) {
      throw new Error('No active session');
    }

    const session = stateService.getSession(context.sessionId);
    if (!session) {
      return {
        content: [{ type: 'text', text: 'Session not found. Please restart the game.' }],
        isError: true
      };
    }

    const playerState = stateService.getPlayerState(session.playerId);
    if (!playerState) {
      return {
        content: [{ type: 'text', text: 'Player state not found.' }]
      };
    }

    if (playerState.inventory.length === 0) {
      return {
        content: [{ type: 'text', text: 'Your inventory is empty.' }]
      };
    }

    const inventoryItems = playerState.inventory
      .map(itemId => {
        const item = items[itemId];
        return item ? `${item.name}: ${item.description}` : itemId;
      })
      .join('\n');

    return {
      content: [
        { type: 'text', text: 'Your inventory contains:' },
        { type: 'text', text: inventoryItems }
      ]
    };
  }
  

  /**
   * Get all available tools for a player
   */
  getAvailableTools(playerId: string): Tool[] {
    // console.log('getAvailableTools', playerId);
    const playerState = stateService.getPlayerState(playerId);
    if (!playerId || playerId === 'all' || !playerState) {
      return [];
    }

    const world = stateService.getWorld();
    const room = world.rooms[playerState.room];

    // Base tools always available
    const tools: Tool[] = [
      {
        name: 'look',
        description: 'Provides a description of your current surroundings.',
        execute: async (params, context) => {
          return this.Look(params, context);
        }
      },
      {
        name: 'move',
        description: 'Moves you in the specified direction.',
        parameters: {
          direction: {
            description: 'The direction to move (north, south, east, west).',
            required: true,
            type: 'string'
          }
        },
        execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
          return await this.Move(params, context);
        }
      },
      {
        name: 'inventory',
        description: 'Check your inventory contents.',
        execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
          return await this.Inventory(params, context);
        }
      }
    ];

    // Add conditional tools based on state
    if (room.items.length > 0) {
      tools.push({
        name: 'pick_up',
        description: 'Pick up an item in the room.',
        parameters: {
          item: {
            description: 'The item to pick up.',
            required: true,
            type: 'string'
          }
        },
        execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
            if (!context.sessionId) {
              throw new Error('No active session');
            }
            const { item } = params as unknown as { item: string };
        
            const session = stateService.getSession(context.sessionId);
            if (!session) {
              return {
                content: [{ type: 'text', text: 'Session not found. Please restart the game.' }],
                isError: true
              };
            }
        
            const success = stateService.addItemToInventory(session.playerId, item);
            if (!success) {
              return {
                content: [{ type: 'text', text: `There is no ${item} here.` }]
              };
            }
        
            const itemName = items[item]?.name || item;
           
            return {
              content: [{ type: 'text', text: `You picked up the ${itemName}.` }]
            };
          }
      });
    }

    if (playerState.monsterPresent && room.monsters?.length > 0) {
      tools.push({
        name: 'battle',
        description: 'Fight a monster',
        execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
            if (!context.sessionId) {
              throw new Error('No active session');
            }
        
            const session = stateService.getSession(context.sessionId);
            if (!session) {
              return {
                content: [{ type: 'text', text: 'Session not found. Please restart the game.' }],
                isError: true
              };
            }
        
            if (!stateService.canBattle(session.playerId)) {
              return {
                content: [{ type: 'text', text: 'There are no enemies to fight here.' }]
              };
            }
        
            const battleResult = stateService.battle(session.playerId);
            if (!battleResult.monsterName) {
              return {
                content: [{ type: 'text', text: 'There are no enemies to fight here.' }]
              };
            }
        
            const monsterName = monsters[battleResult.monsterName]?.name || battleResult.monsterName;
            return {
              content: [{ 
                type: 'text', 
                text: battleResult.success 
                  ? `You defeated the ${monsterName}!`
                  : `The ${monsterName} wounded you. You need to try again.`
              }]
            };
          }
      });
    }

    if (room.hasQuest && !playerState.hasQuest) {
      tools.push({
        name: 'accept_quest',
        description: 'Accept a quest',
        execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
            if (!context.sessionId) {
              throw new Error('No active session');
            }
        
            const session = stateService.getSession(context.sessionId);
            if (!session) {
              return {
                content: [{ type: 'text', text: 'Session not found. Please restart the game.' }],
                isError: true
              };
            }
        
            const success = stateService.acceptQuest(session.playerId);
            if (!success) {
              return {
                content: [{ type: 'text', text: 'There is no quest available here.' }]
              };
            }
        
            return {
              content: [{ type: 'text', text: 'You accept the quest: "The Lost Artifact". Find the ancient artifact hidden in the dungeon.' }]
            };
          }
      });
    }

    if (room.id === 'treasure_room' && !room.monsters?.includes('dragon')) {
      tools.push({
        name: 'open_chest',
        description: 'Open a treasure chest',
        execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
            if (!context.sessionId) {
              throw new Error('No active session');
            }
        
            const session = stateService.getSession(context.sessionId);
            if (!session) {
              return {
                content: [{ type: 'text', text: 'Session not found. Please restart the game.' }],
                isError: true
              };
            }
        
            const playerState = stateService.getPlayerState(session.playerId);
            if (!playerState) {
              return {
                content: [{ type: 'text', text: 'Player state not found.' }]
              };
            }
        
            if (playerState.room !== 'treasure_room') {
              return {
                content: [{ type: 'text', text: 'There are no treasure chests here.' }]
              };
            }
        
            const room = stateService.getWorld().rooms[playerState.room];
            if (!room.monsters.includes('dragon')) {
              // Only allow opening chest if dragon is defeated
              stateService.addItemToInventory(session.playerId, 'magic_gem');
              return {
                content: [{ type: 'text', text: 'You open the treasure chest and find a magical gem glowing with mysterious energy!' }]
              };
            } else {
              return {
                content: [{ type: 'text', text: 'The dragon guards the treasure chest. You must defeat it first!' }]
              };
            }
          }
      });
    }

    return tools;
  }
  
  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    this.tools[tool.name] = tool;
    this.emit('toolRegistered', tool.name);
  }
  
  // /**
  //  * Execute a tool action
  //  */
  // async executeTool(name: string, playerId: string, params: ToolParameters = {}): Promise<ToolResponse> {
  //   const tool = this.tools[name];
  //   if (!tool) {
  //     return {
  //       content: [{ type: 'text', text: `Tool '${name}' not found.` }],
  //       isError: true
  //     };
  //   }
    
  //   // Get player state using session ID if provided, otherwise use player ID
  //   let playerState;
  //   const session = stateService.getSession(playerId);
  //   if (session) {
  //     playerState = stateService.getPlayerState(session.playerId);
  //   } else {
  //     playerState = stateService.getPlayerState(playerId);
  //   }

  //   if (!playerState) {
  //     return {
  //       content: [{ type: 'text', text: 'Session not found. Please restart the game.' }],
  //       isError: true
  //     };
  //   }
    
  //   try {
  //     const availableTools = this.getAvailableTools(playerState.player_id);
  //     if (!availableTools.find(t => t.name === name)) {
  //       return {
  //         content: [{ type: 'text', text: `The action '${name}' is not available right now.` }],
  //         isError: true
  //       };
  //     }
      
  //     return await tool.execute(params, { sessionId: session?.id });
  //   } catch (error) {
  //     const toolError = error as ToolError;
  //     // console.log(`Error executing tool ${name}:`, toolError);
  //     return {
  //       content: [{ type: 'text', text: `Error executing '${name}': ${toolError.message}` }],
  //       isError: true
  //     };
  //   }
  // }
  
  /**
   * Register the default game tools
   */
  public registerDefaultTools(): void {
    // Look tool
    this.registerTool({
      name: 'look',
      description: 'Provides a description of the player\'s current room.',
      execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult>=> {
        return this.Look(params, context);
      }
    });
    
    // Move tool
    this.registerTool({
      name: 'move',
      description: 'Moves the player to a different room.',
      parameters: {
        direction: {
          description: 'The direction to move (north, south, east, west).',
          required: true,
          type: 'string'
        }
      },
      execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult> => {
        return this.Move(params, context);
      }
    });
    
    // Pick up tool
    this.registerTool({
      name: 'inventory',
      description: 'Check your inventory contents.',
      execute: async (params: Record<string, unknown>, context: McpContext): Promise<ToolResult>=> {
        return this.Inventory(params, context);
      }
    });
  }
}

// Create and export a singleton instance
export const toolsService = new ToolsService();
export default toolsService;
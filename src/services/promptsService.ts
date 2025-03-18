import { EventEmitter } from 'events';
import { z } from 'zod';
import type { PromptDefinition, PromptResult, McpContext } from '../types/mcp.js';
import stateService from './stateService.js';
import { items, monsters, quests } from '../config/world.js';

/**
 * Prompts Service
 * 
 * Manages the game prompts available to players based on their current state
 */
class PromptsService extends EventEmitter {
  private prompts: Map<string, { definition: PromptDefinition; handler: (params: Record<string, unknown>, context: McpContext) => Promise<PromptResult> }> = new Map();
  
  constructor() {
    super();
    this.registerDefaultPrompts();
  }

  /**
   * Register a new prompt
   */
  registerPrompt(
    definition: PromptDefinition, 
    handler: (params: Record<string, unknown>, context: McpContext) => Promise<PromptResult>
  ): void {
    this.prompts.set(definition.name, { definition, handler });
    this.emit('promptRegistered', definition.name);
  }

  /**
   * Remove a prompt
   */
  removePrompt(name: string): void {
    this.prompts.delete(name);
    this.emit('promptRemoved', name);
  }

  /**
   * Get all available prompts for a player based on their current state
   */
  getAvailablePrompts(playerId: string): PromptDefinition[] {
    if (!playerId || playerId === 'all') {
      return [];
    }

    const playerState = stateService.getPlayerState(playerId);
    if (!playerState) {
      return [];
    }
    
    const world = stateService.getWorld();
    const room = world.rooms[playerState.room];

    // Filter prompts based on player state
    return Array.from(this.prompts.values())
      .filter(({ definition }) => {
        // Room description prompt is always available
        if (definition.name === 'room_description') {
          return true;
        }
        
        // Welcome prompt is always available
        if (definition.name === 'welcome') {
          return true;
        }
        
        // Inventory prompt is always available
        if (definition.name === 'inventory_prompt') {
          return true;
        }
        
        // Quest prompt is only available if room has quest and player hasn't accepted it
        if (definition.name === 'quest_prompt') {
          return room && room.hasQuest && !playerState.hasQuest;
        }
        
        // Battle prompt is only available if monster is present
        if (definition.name === 'battle_prompt') {
          return playerState.monsterPresent && room && room.monsters && room.monsters.length > 0;
        }
        
        // Default to available
        return true;
      })
      .map(({ definition }) => definition);
  }

  /**
   * Execute a prompt
   */
  async executePrompt(name: string, params: Record<string, unknown>, context: McpContext): Promise<PromptResult> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      return {
        messages: [{ 
          role: 'assistant', 
          content: { type: 'text', text: `Prompt '${name}' not found.` }
        }]
      };
    }
    
    try {
      return await prompt.handler(params, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return {
        messages: [{ 
          role: 'assistant', 
          content: { type: 'text', text: `Error executing prompt '${name}': ${errorMessage}` }
        }]
      };
    }
  }
  
  /**
   * Register the default game prompts
   */
  private registerDefaultPrompts(): void {
    // Room description prompt - provides a description of the current room
    this.registerPrompt(
      {
        name: 'room_description',
        description: 'A description of your current location',
        parameters: {
            detail_level: {
                name: 'detail_level',
                description: 'The level of detail for the room description',
                type: 'string',
                required: false,
            }
        }
      },
      async (params, context) => {
        if (!context.sessionId) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: No session ID provided.' }
            }]
          };
        }

        const session = stateService.getSession(context.sessionId);
        if (!session) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Session not found.' }
            }]
          };
        }

        const playerState = stateService.getPlayerState(session.playerId);
        if (!playerState) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Player state not found.' }
            }]
          };
        }
        
        const world = stateService.getWorld();
        const room = world.rooms[playerState.room];
        if (!room) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Invalid room.' }
            }]
          };
        }
        
        return {
          messages: [{ 
            role: 'assistant', 
            content: { type: 'text', text: `You are in ${room.name}. ${room.description}` }
          }]
        };
      }
    );
    
    // Quest prompt - only appears if the player has not accepted a quest
    this.registerPrompt(
      {
        name: 'quest_prompt',
        description: 'Information about an available quest',
        parameters: undefined
      },
      async (params, context) => {
        if (!context.sessionId) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: No session ID provided.' }
            }]
          };
        }

        const session = stateService.getSession(context.sessionId);
        if (!session) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Session not found.' }
            }]
          };
        }

        const playerState = stateService.getPlayerState(session.playerId);
        if (!playerState) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Player state not found.' }
            }]
          };
        }
        
        const world = stateService.getWorld();
        const room = world.rooms[playerState.room];
        if (!room || !room.hasQuest || playerState.hasQuest) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'There are no quests available here.' }
            }]
          };
        }
        
        return {
          messages: [{ 
            role: 'assistant', 
            content: { 
              type: 'text', 
              text: 'A weathered scroll on the wall describes a quest: "The Lost Artifact"\n\nThe ancient artifact of power is said to be hidden somewhere in these dungeons. Find it and return it to the kingdom for a great reward.\n\nWill you accept this quest?' 
            }
          }]
        };
      }
    );
    
    // Battle prompt - only appears if a monster is present
    this.registerPrompt(
      {
        name: 'battle_prompt',
        description: 'Information about a monster encounter',
        parameters: undefined
      },
      async (params, context) => {
        if (!context.sessionId) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: No session ID provided.' }
            }]
          };
        }

        const session = stateService.getSession(context.sessionId);
        if (!session) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Session not found.' }
            }]
          };
        }

        const playerState = stateService.getPlayerState(session.playerId);
        if (!playerState || !playerState.monsterPresent) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'There are no monsters here.' }
            }]
          };
        }
        
        const world = stateService.getWorld();
        const room = world.rooms[playerState.room];
        if (!room || !room.monsters || room.monsters.length === 0) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'There are no monsters here.' }
            }]
          };
        }

        const monsterName = monsters[room.monsters[0]]?.name || room.monsters[0];
        
        return {
          messages: [{ 
            role: 'assistant', 
            content: { 
              type: 'text', 
              text: `A ${monsterName} blocks your path! It looks menacing and ready to attack. Prepare for battle or try to find another way around.` 
            }
          }]
        };
      }
    );

    // Inventory prompt - shows current inventory
    this.registerPrompt(
      {
        name: 'inventory_prompt',
        description: 'Shows your current inventory',
        parameters: undefined
      },
      async (params, context) => {
        if (!context.sessionId) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: No session ID provided.' }
            }]
          };
        }

        const session = stateService.getSession(context.sessionId);
        if (!session) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Session not found.' }
            }]
          };
        }

        const playerState = stateService.getPlayerState(session.playerId);
        if (!playerState) {
          return {
            messages: [{ 
              role: 'assistant', 
              content: { type: 'text', text: 'Error: Player state not found.' }
            }]
          };
        }

        if (playerState.inventory.length === 0) {
          return {
            messages: [{
              role: 'assistant',
              content: { type: 'text', text: 'Your inventory is empty.' }
            }]
          };
        }

        const inventoryText = playerState.inventory
          .map(itemId => {
            const item = items[itemId];
            return item ? `${item.name}: ${item.description}` : itemId;
          })
          .join('\n');

        return {
          messages: [{
            role: 'assistant',
            content: { type: 'text', text: `Your inventory contains:\n${inventoryText}` }
          }]
        };
      }
    );

    // Welcome prompt - shown when starting game
    this.registerPrompt(
      {
        name: 'welcome',
        description: 'Welcome message and instructions',
        parameters: undefined
      },
      async () => {
        return {
          messages: [{
            role: 'assistant',
            content: {
              type: 'text',
              text: `Welcome to the MUD Adventure!

You find yourself at the entrance of a mysterious dungeon. Your quest, should you choose to accept it, is to explore its depths, battle monsters, and discover ancient treasures.

Available commands:
- look - Examine your surroundings
- move <direction> - Move north, south, east, or west
- inventory - Check your inventory
- pick_up <item> - Pick up an item
- battle - Fight a monster (if present)
- accept_quest - Accept an available quest

Good luck on your adventure!`
            }
          }]
        };
      }
    );
  }
}

// Create and export a singleton instance
export const promptsService = new PromptsService();
export default promptsService;
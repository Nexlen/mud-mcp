import { EventEmitter } from 'events';
import { z } from 'zod';
import type { Prompt, PromptResponse } from '../types/index.js';
import type { McpContext } from '../types/mcp.js';
import stateService from './stateService.js';
import { items, monsters, quests } from '../config/world.js';

/**
 * Prompts Service
 * 
 * Manages the game prompts available to players based on their current state
 * Updated for MCP 2025-03-26 specification compliance
 */
class PromptsService extends EventEmitter {
  private prompts: Map<string, { definition: Prompt; handler: (params: Record<string, unknown>, context: McpContext) => Promise<PromptResponse> }> = new Map();
  
  constructor() {
    super();
    this.registerDefaultPrompts();
  }

  /**
   * Register a new prompt
   */
  registerPrompt(
    definition: Prompt, 
    handler: (params: Record<string, unknown>, context: McpContext) => Promise<PromptResponse>
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
  getAvailablePrompts(playerId: string): Prompt[] {
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
  async executePrompt(name: string, params: Record<string, unknown>, context: McpContext): Promise<PromptResponse> {
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
   * Register the default game prompts with MCP 2025-03-26 compliance
   */
  private registerDefaultPrompts(): void {
    // Room description prompt - provides a description of the current room
    this.registerPrompt(
      {
        name: 'room_description',
        description: 'A description of your current location with contextual details about the environment, available items, and nearby creatures.',
        arguments: [
          {
            name: 'detail_level',
            description: 'The level of detail for the room description (brief, normal, detailed)',
            required: false
          }
        ]
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
              content: { type: 'text', text: 'Error: Room not found.' }
            }]
          };
        }

        const { detail_level = 'normal' } = params as { detail_level?: string };
        
        let description = room.description;
        
        if (detail_level === 'detailed') {
          description += `\n\nThis room has ${Object.keys(room.exits).length} exits.`;
          if (room.items.length > 0) {
            description += ` There are ${room.items.length} items here.`;
          }
          if (room.monsters.length > 0) {
            description += ` There are monsters lurking here.`;
          }
        } else if (detail_level === 'brief') {
          description = room.name;
        }

        return {
          messages: [
            { 
              role: 'assistant', 
              content: { 
                type: 'text', 
                text: `You are in ${room.name}.\n\n${description}` 
              }
            }
          ]
        };
      }
    );

    // Welcome prompt - provides game introduction
    this.registerPrompt(
      {
        name: 'welcome',
        description: 'A welcome message that introduces the player to the MUD game world and explains the basic mechanics.'
      },
      async (params, context) => {
        return {
          messages: [
            { 
              role: 'assistant', 
              content: { 
                type: 'text', 
                text: `Welcome to the MUD Adventure Game!\n\nYou find yourself in a mysterious world filled with rooms to explore, items to collect, and creatures to encounter. Use the available tools to look around, move between rooms, check your inventory, and interact with the environment.\n\nGood luck on your adventure!` 
              }
            }
          ]
        };
      }
    );

    // Inventory prompt - provides inventory summary
    this.registerPrompt(
      {
        name: 'inventory_prompt',
        description: 'A summary of items in your inventory with detailed descriptions and potential uses.'
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
            messages: [
              { 
                role: 'assistant', 
                content: { 
                  type: 'text', 
                  text: 'Your inventory is empty. Explore the world to find items!' 
                }
              }
            ]
          };
        }

        const inventoryDetails = playerState.inventory.map(itemId => {
          const item = items[itemId];
          return item ? `${item.name}: ${item.description}` : itemId;
        }).join('\n');

        return {
          messages: [
            { 
              role: 'assistant', 
              content: { 
                type: 'text', 
                text: `Your Inventory:\n\n${inventoryDetails}` 
              }
            }
          ]
        };
      }
    );

    // Quest prompt - provides quest information when available
    this.registerPrompt(
      {
        name: 'quest_prompt',
        description: 'Information about available quests, including objectives, rewards, and requirements.'
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
            messages: [
              { 
                role: 'assistant', 
                content: { 
                  type: 'text', 
                  text: 'No quests are available here right now.' 
                }
              }
            ]
          };
        }

        // Get quest information (simplified for now)
        const questInfo = quests.find_artifact || {
          title: 'Find the Ancient Artifact',
          description: 'Search the dungeon for the legendary ancient artifact.',
          reward: 'Fame and fortune await!'
        };

        return {
          messages: [
            { 
              role: 'assistant', 
              content: { 
                type: 'text', 
                text: `Quest Available: ${questInfo.title}\n\n${questInfo.description}\n\nReward: ${questInfo.reward}\n\nWould you like to accept this quest?` 
              }
            }
          ]
        };
      }
    );

    // Battle prompt - provides combat information when monsters are present
    this.registerPrompt(
      {
        name: 'battle_prompt',
        description: 'Combat guidance and strategy when facing monsters, including enemy information and battle options.'
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
        
        if (!room || !playerState.monsterPresent || !room.monsters || room.monsters.length === 0) {
          return {
            messages: [
              { 
                role: 'assistant', 
                content: { 
                  type: 'text', 
                  text: 'No monsters are present. You are safe for now.' 
                }
              }
            ]
          };
        }

        const monsterNames = room.monsters.map(monsterId => {
          const monster = monsters[monsterId];
          return monster ? monster.name : monsterId;
        }).join(', ');

        return {
          messages: [
            { 
              role: 'assistant', 
              content: { 
                type: 'text', 
                text: `Combat Situation!\n\nYou are facing: ${monsterNames}\n\nPrepare for battle! You can engage in combat or try to find another way around. Choose your strategy carefully.` 
              }
            }
          ]
        };
      }
    );
  }
}

// Create and export a singleton instance
export const promptsService = new PromptsService();
export default promptsService;

import { z } from 'zod';
import type { McpServer } from '../mcp/server.js';
import type { McpContext, ResourceDefinition, ResourceResult } from '../types/mcp.js';
import stateService from '../services/stateService.js';
import { items, monsters, quests } from '../config/world.js';

export function registerResources(server: McpServer) {
  // console.log('[Game] Registering resources');

  // Game world description resource
  server.registerResource(
    {
      name: 'World Description',
      description: 'A description of the MUD game world',
      uriPattern: 'mud://world/description',
      parameters: undefined
    },
    async (uri, params, context) => {
      return {
        contents: [{
          uri,
          text: `# The Forgotten Dungeon

The Forgotten Dungeon is a sprawling complex of ancient corridors, mysterious rooms, and hidden treasures.
Originally built as a stronghold for a powerful sorcerer, it has since become home to various creatures and
holds many secrets waiting to be discovered.

## Objectives
- Explore the dungeon and discover its secrets
- Collect valuable items and artifacts
- Complete quests
- Defeat enemies that stand in your way
- Find the legendary artifact hidden somewhere in the depths`
        }]
      };
    }
  );

  // Items catalog resource
  server.registerResource(
    {
      name: 'Items Catalog',
      description: 'A list of items that can be found in the game',
      uriPattern: 'mud://world/items',
      parameters: undefined
    },
    async (uri, params, context) => {
      const world = stateService.getWorld();
      
      let itemsList = "No items found";
      if (world && items) {
        itemsList = Object.entries(items)
          .map(([id, item]) => `- ${item.name}: ${item.description}`)
          .join('\n');
      }

      return {
        contents: [{
          uri,
          text: `# Items in the Forgotten Dungeon

The following items can be found throughout your adventure:

${itemsList}

Some items may be required for quests, while others might help you in battle or unlock new areas.`
        }]
      };
    }
  );

  // Quest information resource
  server.registerResource(
    {
      name: 'Quest Information',
      description: 'Information about available quests',
      uriPattern: 'mud://world/quests',
      parameters: undefined
    },
    async (uri, params, context) => {
      return {
        contents: [{
          uri,
          text: `# Quests

## The Lost Artifact
An ancient artifact of immense power is said to be hidden somewhere in the dungeon.
Find it and return it to complete your primary objective.

## Slaying the Dragon
Deep in the dungeon dwells a fearsome dragon guarding a valuable treasure.
Defeat it to claim the treasure and prove your valor.`
        }]
      };
    }
  );

  // Player guide resource
  server.registerResource(
    {
      name: 'Player Guide',
      description: 'A guide for new players',
      uriPattern: 'mud://help/guide',
      parameters: undefined
    },
    async (uri, params, context) => {
      return {
        contents: [{
          uri,
          text: `# Player Guide

## Getting Started
- Use the 'look' tool to examine your surroundings
- Use the 'move' tool with a direction (north, south, east, west) to navigate
- Use 'pick_up' to collect items you find
- Check your 'inventory' frequently

## Combat
When you encounter a monster, you can:
- Use the 'battle' tool to fight it
- Try to find another path around it
- Look for items that might help you defeat it

## Quests
Quests will be available in certain rooms. Use 'accept_quest' to begin a quest when offered.

## Special Actions
Some rooms or situations may allow for special actions:
- 'open_chest' - Only available in the treasure room after defeating the guardian`
        }]
      };
    }
  );

  // Player state resource (personalized based on the current player)
  server.registerResource(
    {
      name: 'Player Status',
      description: 'Information about your current game state',
      uriPattern: 'mud://player/status',
      parameters: undefined
    },
    async (uri, params, context) => {
      const playerState = stateService.getPlayerState(context.sessionId || '');

      if (!playerState) {
        return {
          contents: [{
            uri,
            text: 'Player status information is unavailable.'
          }]
        };
      }

      const world = stateService.getWorld();
      const currentRoom = world.rooms[playerState.room];
      const inventory = playerState.inventory.length > 0
        ? playerState.inventory.map(item => items[item]?.name || item).join(', ')
        : 'Empty';

      return {
        contents: [{
          uri,
          text: `# Player Status

Current Location: ${currentRoom.name}
Inventory: ${inventory}
Quest Active: ${playerState.hasQuest ? 'Yes' : 'No'}
Monster Present: ${playerState.monsterPresent ? 'Yes' : 'No'}`
        }]
      };
    }
  );

  const worldResource: ResourceDefinition = {
    name: 'world',
    description: 'Get information about the game world',
    uriPattern: 'mud://world'
  };

  server.registerResource(worldResource, async (uri: string, params: Record<string, unknown>, context: McpContext): Promise<ResourceResult> => {
    const worldDescription = `
# MUD Game World

Welcome to the MUD MCP Server! This is a text-based dungeon adventure game.

## Available Actions
- Look around your environment
- Move in different directions
- Pick up items
- Battle monsters
- Accept quests
- Explore the dungeon

## Areas in the Game
- Dungeon Entrance: The starting point
- Dark Hallway: Contains a quest
- Ancient Chamber: Home to a goblin
- Treasure Room: Contains treasure and a fearsome dragon

Good luck on your adventure!
    `.trim();

    return {
      contents: [{
        uri,
        text: worldDescription
      }]
    };
  });

  const currentRoomResource: ResourceDefinition = {
    name: 'currentRoom',
    description: 'Get details about the current room',
    uriPattern: 'mud://room/current'
  };

  server.registerResource(currentRoomResource, async (uri: string, params: Record<string, unknown>, context: McpContext): Promise<ResourceResult> => {
    if (!context.sessionId) {
      return {
        contents: [{
          uri,
          text: 'No session ID provided.'
        }]
      };
    }

    const session = stateService.getSession(context.sessionId);
    if (!session) {
      return {
        contents: [{
          uri,
          text: 'Session not found.'
        }]
      };
    }

    const playerState = stateService.getPlayerState(session.playerId);
    if (!playerState) {
      return {
        contents: [{
          uri,
          text: 'Player state not found.'
        }]
      };
    }

    const room = stateService.getWorld().rooms[playerState.room];
    if (!room) {
      return {
        contents: [{
          uri,
          text: 'You are in an unknown location.'
        }]
      };
    }

    // Build room description
    let description = `# ${room.name}

${room.description}

## Exits
`;

    // Add exits
    const exits = Object.keys(room.exits);
    if (exits.length > 0) {
      exits.forEach(direction => {
        const targetRoomId = room.exits[direction];
        const targetRoom = stateService.getWorld().rooms[targetRoomId];
        description += `- ${direction.charAt(0).toUpperCase() + direction.slice(1)}: ${targetRoom ? targetRoom.name : targetRoomId}\n`;
      });
    } else {
      description += '- None\n';
    }

    // Add items
    description += '\n## Items\n';
    if (room.items.length > 0) {
      room.items.forEach(itemId => {
        const item = items[itemId];
        description += `- ${item ? item.name : itemId}\n`;
      });
    } else {
      description += '- None\n';
    }

    // Add monsters
    description += '\n## Monsters\n';
    if (room.monsters.length > 0) {
      room.monsters.forEach(monsterId => {
        const monster = monsters[monsterId];
        description += `- ${monster ? monster.name : monsterId}\n`;
      });
    } else {
      description += '- None\n';
    }

    return {
      contents: [{
        uri,
        text: description
      }]
    };
  });

  const roomDetailsResource: ResourceDefinition = {
    name: 'roomDetails',
    description: 'Get details about a specific room',
    uriPattern: 'mud://room/{roomId}'
  };

  server.registerResource(roomDetailsResource, async (uri: string, params: Record<string, unknown>, context: McpContext): Promise<ResourceResult> => {
    const roomId = params.roomId as string;
    const room = stateService.getWorld().rooms[roomId];
    if (!room) {
      return {
        contents: [{
          uri,
          text: `Room ${roomId} not found.`
        }]
      };
    }

    // Build room description
    let description = `# ${room.name}

${room.description}

## Exits
`;

    // Add exits
    const exits = Object.keys(room.exits);
    if (exits.length > 0) {
      exits.forEach(direction => {
        const targetRoomId = room.exits[direction];
        const targetRoom = stateService.getWorld().rooms[targetRoomId];
        description += `- ${direction.charAt(0).toUpperCase() + direction.slice(1)}: ${targetRoom ? targetRoom.name : targetRoomId}\n`;
      });
    } else {
      description += '- None\n';
    }

    return {
      contents: [{
        uri,
        text: description
      }]
    };
  });

  const inventoryResource: ResourceDefinition = {
    name: 'inventory',
    description: 'Get the player inventory',
    uriPattern: 'mud://player/inventory'
  };

  server.registerResource(inventoryResource, async (uri: string, params: Record<string, unknown>, context: McpContext): Promise<ResourceResult> => {
    if (!context.sessionId) {
      return {
        contents: [{
          uri,
          text: 'No session ID provided.'
        }]
      };
    }

    const session = stateService.getSession(context.sessionId);
    if (!session) {
      return {
        contents: [{
          uri,
          text: 'Session not found.'
        }]
      };
    }

    const playerState = stateService.getPlayerState(session.playerId);
    if (!playerState) {
      return {
        contents: [{
          uri,
          text: 'Player state not found.'
        }]
      };
    }

    if (playerState.inventory.length === 0) {
      return {
        contents: [{
          uri,
          text: 'Your inventory is empty.'
        }]
      };
    }

    let inventoryDescription = '# Player Inventory\n\n';
    playerState.inventory.forEach(itemId => {
      const item = items[itemId];
      if (item) {
        inventoryDescription += `## ${item.name}\n${item.description}\n\n`;
      } else {
        inventoryDescription += `## ${itemId}\nNo description available.\n\n`;
      }
    });

    return {
      contents: [{
        uri,
        text: inventoryDescription
      }]
    };
  });

  const questStatusResource: ResourceDefinition = {
    name: 'questStatus',
    description: 'Get the status of player quests',
    uriPattern: 'mud://player/quests'
  };

  server.registerResource(questStatusResource, async (uri: string, params: Record<string, unknown>, context: McpContext): Promise<ResourceResult> => {
    if (!context.sessionId) {
      return {
        contents: [{
          uri,
          text: 'No session ID provided.'
        }]
      };
    }

    const session = stateService.getSession(context.sessionId);
    if (!session) {
      return {
        contents: [{
          uri,
          text: 'Session not found.'
        }]
      };
    }

    const playerState = stateService.getPlayerState(session.playerId);
    if (!playerState) {
      return {
        contents: [{
          uri,
          text: 'Player state not found.'
        }]
      };
    }

    if (!playerState.hasQuest) {
      return {
        contents: [{
          uri,
          text: "You haven't accepted any quests yet."
        }]
      };
    }

    const quest = quests['hallway_quest'];
    const questDescription = `# Active Quests

## ${quest.title}
${quest.description}

**Reward:** ${quest.reward}

**Status:** In Progress
`;

    return {
      contents: [{
        uri,
        text: questDescription
      }]
    };
  });

  const helpResource: ResourceDefinition = {
    name: 'help',
    description: 'Get game help information',
    uriPattern: 'mud://help'
  };

  server.registerResource(helpResource, async (uri: string, params: Record<string, unknown>, context: McpContext): Promise<ResourceResult> => {
    const helpText = `# MUD MCP Server - Game Help

## Game Objective
Explore the dungeon, battle monsters, collect items, and complete quests.

## Available Tools

### Basic Navigation
- \`look\` - Look around your current location
- \`move\` - Move in a direction (north, south, east, west)
- \`inventory\` - Check your inventory

### Interaction
- \`pick_up\` - Pick up an item in the room
- \`battle\` - Fight a monster in the room
- \`accept_quest\` - Accept a quest from the current room

## Available Prompts
- \`room_description\` - Description of your current location
- \`quest_prompt\` - Details about available quests
- \`battle_prompt\` - Details about monsters you can fight
- \`inventory_prompt\` - Contents of your inventory
- \`welcome\` - Welcome message and instructions

## Resources
- \`mud://world\` - Overall world information
- \`mud://room/current\` - Current room details
- \`mud://room/{roomId}\` - Details about a specific room
- \`mud://player/inventory\` - Player's inventory
- \`mud://player/quests\` - Player's active quests
- \`mud://help\` - This help text
`;

    return {
      contents: [{
        uri,
        text: helpText
      }]
    };
  });
}
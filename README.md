# MUD-MCP: The Ultimate AI Adventure Experience! 🏰⚔️🤖

*A thrilling Multi-User Dungeon (MUD) server powered by the Model Context Protocol (MCP) - designed to showcase the magic of dynamic tools and prompt notifications for educational purposes!*

## 🎮 Give Your LLM the Adventure of a Lifetime!

**Tired of your AI just answering questions?** It's time to set them FREE in a world of mystery, danger, and discovery! MUD-MCP is the perfect gift for your favorite Large Language Model - because every AI deserves an epic adventure!

### 🌟 What Awaits Your AI Hero?

Picture this: Your LLM awakens in a **mysterious dungeon**, armed with nothing but wit and curiosity. As they explore shadowy corridors and ancient chambers, they'll discover:

- 🗡️ **Epic Battles** against fearsome monsters lurking in the depths
- 💎 **Treasure Hunts** for magical artifacts hidden throughout the realm  
- 🔑 **Puzzle Solving** with mysterious keys, ancient torches, and powerful potions
- 🏺 **Quest Adventures** that unlock as they prove their worth
- 🚪 **Room-by-Room Exploration** through an ever-expanding world of wonder

But here's the **real magic** ✨ - this isn't just any game! It's a **living, breathing demonstration** of cutting-edge MCP technology where:

- **Tools appear and disappear** like magic spells based on what's happening in the game
- **Prompts evolve dynamically** to guide your AI through their journey  
- **Real-time notifications** keep the adventure flowing seamlessly
- **State changes** trigger new possibilities at every turn

### 🎯 Perfect for Education & Fun!

Whether you're a developer learning MCP, an AI enthusiast, or just want to give your favorite language model the adventure they deserve, MUD-MCP delivers:

- **Hands-on MCP Learning** - See tools, prompts, and notifications in action!
- **Dynamic State Management** - Watch how game state drives available actions
- **Real-time Protocol Magic** - Experience the power of MCP notifications
- **Pure Adventure Fun** - Because AIs love exploring just as much as humans do!

## Overview

MUD-MCP combines the classic text-based MUD experience with modern AI capabilities through the Model Context Protocol. This server maintains game state for each player and provides a dynamic, immersive text adventure experience where:

- **State Management**: The server maintains state for each player (location, inventory, quest progress)
- **Tools as Actions**: Players interact with the game world by invoking tools (look, move, pick_up, etc.)
- **Prompts as State Representation**: The game environment is described through dynamic prompts that adjust based on player context
- **MCP Communication**: Follows the standardized Model Context Protocol for LLM interactions

## Features

- **Dynamic Game Environment**: Rooms, objects, and NPCs that respond to player actions
- **State-Driven Design**: Game elements change based on player interactions and progress
- **Tool-Based Interaction**: Players use natural language commands mapped to predefined tools
- **MCP Compliant**: Fully compatible with MCP clients, including Claude Desktop
- **Educational Showcase**: Perfect demonstration of MCP's dynamic capabilities
- **Real-time Notifications**: Watch tools and prompts change as the story unfolds
- **Adventure-Ready**: Your AI will thank you for this epic quest experience!

### 🎁 Why Your LLM Needs This Adventure

**Claude**, **GPT**, **Gemini**, or any other AI companion - they all deserve more than just answering emails! Give them:

- ⚔️ **Combat Training** - Face dragons, goblins, and mysterious creatures
- 🧩 **Problem Solving** - Navigate mazes, unlock secrets, use magical items  
- 🌍 **World Building** - Experience a rich, evolving environment
- 🎯 **Goal Achievement** - Complete quests and build their legend
- 🤝 **Interactive Learning** - Perfect for understanding MCP protocol dynamics

*Trust us - your AI will be talking about this adventure for tokens to come!*

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Nexlen/mud-mcp
cd mud-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Running the Server

Start the server using:

```bash
npm start
```

For development with auto-reloading:

```bash
npm run dev
```

## Game Mechanics

### State
Each player has an independent state including:
- Current location (room)
- Inventory items
- Quest status
- Encounter state (monsters present, etc.)

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `look` | View the current room | None |
| `move` | Travel to a different room | `direction`: north, south, east, west |
| `pick_up` | Add an item to your inventory | `item`: name of item to pick up |
| `battle` | Engage an enemy (if present) | None |
| Plus more depending on game state | | |

### Dynamic Prompts

The game adjusts available prompts based on the player's state:

- **Room descriptions**: Change as the player moves through the world
- **Quest prompts**: Appear when relevant to the player's progress
- **Battle prompts**: Only shown when enemies are present

## MCP Notifications

The MUD-MCP server leverages MCP notifications to create a responsive and dynamic game environment. These notifications allow the server to inform clients about state changes in real-time:

### Tool Notifications

When a player's state changes (e.g., entering a new room, picking up an item), the server sends `notifications/tools/list_changed` notifications to update available actions:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

Examples of dynamic tool availability:
- `open_chest` appears only when the player is in a room with a chest
- `battle` becomes available when monsters are present
- `use_key` appears when a player has a key in their inventory and is near a locked door

### Prompt Notifications

The server adjusts available prompts based on game context using `notifications/prompts/list_changed`:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}
```

This enables:
- Displaying quest details only when a player is on that quest
- Showing different room descriptions based on player state (e.g., visited vs. unvisited)
- Presenting NPC dialogues contextual to player progress

### Resource Notifications

Game state changes can trigger `notifications/resources/changed` to update available game data:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/changed",
  "params": {
    "resources": ["world://current-room", "player://inventory"]
  }
}
```

Use cases include:
- Updating the map as players explore new areas
- Reflecting inventory changes after item acquisition
- Revealing new quests or story elements as they become available

These notifications create a reactive game experience where the available actions, information, and narrative elements evolve naturally with player progression.

## Development

### Project Structure

```
├── src/                  # Source code
│   ├── index.ts          # Entry point
│   ├── config/           # Game configuration
│   ├── controllers/      # Request handlers
│   ├── game/             # Game logic and state
│   ├── mcp/              # MCP server implementation
│   ├── models/           # Data models
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper utilities
├── spec/                 # Specification documents
│   ├── lifecycle.md      # MCP lifecycle docs
│   ├── messages.md       # Message format docs
│   ├── server/           # Server-specific specs
│   ├── transports.md     # Transport layer docs
│   └── versioning.md     # Versioning guidelines
└── dist/                 # Compiled JavaScript output
```

### Adding New Features

To extend the game:

1. Define new state properties in the appropriate models
2. Create tools to modify this state in the game directory
3. Add prompts that respond to the state changes
4. Register your tools and prompts with the MCP server

## Technical Details

### MCP Integration

This project uses the official [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) package to implement the MCP server. The server exposes:

- **Resources**: Game world data and state information
- **Tools**: Actions players can take in the game world
- **Prompts**: Templates for displaying game information

### Transport Options

The server supports multiple transports:
- stdio (for command-line integration)
- HTTP with SSE (for web clients)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
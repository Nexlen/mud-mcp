# MUD-MCP: The Ultimate AI Adventure Experience! 🏰⚔️🤖

*A thrilling Multi-User Dungeon (MUD) server powered by the Model Context Protocol (MCP) - designed to showcase the magic of dynamic tools and prompt notifications for educational purposes!*

## 🚀 Supported MCP Features

MUD-MCP implements the **complete MCP 2025-03-26 specification**, showcasing every major protocol feature in an engaging gaming context:

### 🛠️ **Dynamic Tools** 
**Full MCP Tools Implementation** - The game provides context-sensitive tools that appear and disappear based on your current situation. Tools include `look`, `move`, `inventory`, `take`, `battle`, and `talk`. Each tool uses proper input schemas and annotations, with some tools only becoming available when relevant (like `battle` when monsters are present). This demonstrates how MCP tools can create truly dynamic user interfaces that adapt to application state.

### 📝 **Contextual Prompts**
**Advanced Prompts with Arguments** - The server offers dynamic prompts like `room_description`, `quest_prompt`, `battle_prompt`, and `inventory_prompt` that change based on your game state. Prompts support arguments for customization and automatically appear/disappear based on context (quest prompts only show when quests are available). This showcases how MCP prompts can provide intelligent, state-aware information templates.

### 📊 **Rich Resources**
**Complete Resource System** - Access game data through structured resources like `mud://world` (world map), `mud://room/current` (current location), `mud://player/inventory` (your items), and `mud://help` (game guide). Resources support subscriptions and change notifications, demonstrating how MCP can expose complex application data in a standardized way.

### 🔔 **Real-time Notifications**
**Full Notification Support** - The server sends `tools/list_changed`, `prompts/list_changed`, and `resources/changed` notifications as your game state evolves. When you move rooms, defeat monsters, or pick up items, the available tools and prompts automatically update. This demonstrates MCP's reactive capabilities for creating responsive user experiences.

### 🤖 **AI-Powered Sampling**
**Cutting-edge Sampling Integration** - The server uses MCP sampling to request AI assistance for dynamic content generation. NPCs, monsters, and mystical entities respond with contextual, AI-generated dialogue that considers your current game state. This showcases the newest MCP capability for collaborative AI content creation.

## 🎮 Play with VS Code Agent Mode

**Experience the future of AI-powered adventures!** VS Code's Agent Mode provides the perfect environment for AI assistants to play MUD-MCP:

### **Setting Up Agent Mode**
1. **Install VS Code** with the latest updates
2. **Enable Agent Mode** in VS Code settings
3. **Connect your AI assistant** (Claude, GPT-4, etc.) to VS Code
4. **Install MUD-MCP** as an MCP server in your configuration
5. **Start the adventure** - your AI agent can now explore the dungeon!

### **How Agent Mode Enhances Gameplay**
- **Natural Language Commands**: Your AI can use tools by simply saying "I want to look around" or "Let's battle the dragon"
- **Intelligent Exploration**: The AI can analyze room descriptions, plan routes, and make strategic decisions
- **Dynamic Problem Solving**: When facing challenges, the AI can examine available tools and prompts to find solutions
- **Immersive Roleplay**: With sampling enabled, the AI can engage in rich conversations with NPCs and monsters
- **Persistent Context**: The AI maintains awareness of inventory, quest progress, and game state across the entire adventure

### **Perfect for AI Training & Demonstration**
- **Educational Value**: Watch how AI agents interact with structured environments
- **Protocol Learning**: See MCP features in action through AI interactions
- **Decision Making**: Observe AI problem-solving in a game context
- **Dynamic Adaptation**: Experience how AI handles changing tool availability and contextual prompts

*Your AI assistant becomes the hero of their own adventure story, making decisions, solving puzzles, and exploring the mysterious dungeon using the full power of the Model Context Protocol!*

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

## 🤖 AI-Powered Sampling: Next-Level Immersion

**NEW!** MUD-MCP now features **MCP Sampling** support, bringing AI-generated content directly into your adventure! This cutting-edge feature leverages the Model Context Protocol's sampling capabilities to create dynamic, contextual content that makes every playthrough unique.

### What is MCP Sampling?

MCP Sampling allows the server to request AI assistance from compatible clients (like Claude Desktop) to generate dynamic content in real-time. Instead of pre-written responses, your adventure becomes a collaborative storytelling experience between the game engine and AI.

### 🎭 AI-Enhanced Features

#### Dynamic NPC Dialogue
When you use the `talk` tool with NPCs, the AI generates contextual, character-appropriate responses:

```bash
# Talk to a mysterious spirit
Player: "What secrets do you guard in this chamber?"

# AI generates response based on:
# - The spirit's character traits
# - Current game context
# - Player's quest progress
# - Room atmosphere and lore
```

The AI considers:
- **Character personality** (mysterious spirits vs. gruff monsters vs. helpful guides)
- **Game state context** (player inventory, quest progress, room history)
- **Narrative consistency** (maintaining story continuity across interactions)
- **Immersive atmosphere** (matching the dark, mysterious tone of the dungeon)

#### Smart Content Generation
The sampling service provides multiple content generation capabilities:

| Feature | Description | Use Case |
|---------|-------------|----------|
| **NPC Dialogue** | Context-aware character responses | Talking to monsters, spirits, NPCs |
| **Room Descriptions** | Enhanced environmental storytelling | Detailed room atmosphere and lore |
| **Quest Hints** | Dynamic guidance based on progress | Personalized help when stuck |
| **Flavor Text** | Atmospheric details for actions | Rich descriptions for item use, exploration |

#### Example: AI-Enhanced NPC Interaction

```json
{
  "tool": "talk",
  "parameters": {
    "target": "ancient_spirit"
  }
}
```

**Without Sampling** (static response):
> "The spirit whispers ancient secrets."

**With AI Sampling** (dynamic, contextual):
> "The ethereal figure's eyes flicker with recognition as it notices the torch in your hand. 'Ah, bearer of the eternal flame... you seek passage through the Shadow Gate, do you not? The key you carry bears the mark of the old kingdom, but beware - the guardian beyond remembers the betrayal of your kind.' The spirit's form wavers, pointing toward a hidden passage you hadn't noticed before."

### 🔧 Technical Implementation

#### Capability Detection
The server automatically detects if your MCP client supports sampling:

```typescript
// Client capabilities are checked during initialization
if (clientCapabilities.sampling) {
  // Enable AI-enhanced features
  samplingService.setSamplingHandler(transport.requestSampling);
}
```

#### Fallback Behavior
When sampling is not available, the server gracefully falls back to:
- Pre-written NPC responses
- Static room descriptions
- Traditional quest hints
- Standard flavor text

This ensures the game works perfectly with any MCP client, whether or not it supports sampling.

#### Smart Context Sharing
The sampling requests include relevant game context:

```typescript
const request = {
  messages: [{ role: 'user', content: playerMessage }],
  systemPrompt: `You are ${npcName}, a character in a dark dungeon adventure...`,
  includeContext: 'thisServer', // Shares current game state
  maxTokens: 200,
  temperature: 0.7
};
```

### 🎮 Enhanced Gameplay Experience

#### Before Sampling
- Static, predictable NPC responses
- Limited dialogue options
- Repetitive interactions
- Fixed narrative paths

#### After Sampling
- ✨ **Dynamic conversations** that adapt to your choices
- 🎭 **Character-driven storytelling** with unique personalities
- 🗺️ **Emergent narrative** that unfolds differently each playthrough
- 🔍 **Contextual assistance** that understands your current situation

### 🛠️ For Developers

#### Using the Sampling Service

```typescript
import { samplingService } from './services/samplingService.js';

// Generate NPC dialogue
const response = await samplingService.generateNPCDialogue(
  'mysterious_guard',
  'Can you help me find the exit?',
  'Player is in the dungeon entrance, carrying a torch and key'
);

// Generate atmospheric descriptions
const description = await samplingService.generateRoomDescription(
  'ancient_library',
  'A vast library filled with dusty tomes',
  { hasVisited: false, playerLevel: 3 }
);
```

#### Adding New Sampling Features

1. **Extend the SamplingService** with new generation methods
2. **Update tool handlers** to use AI-generated content
3. **Add fallback content** for non-sampling clients
4. **Test with both sampling and non-sampling scenarios**

### 🎯 Getting Started with Sampling

1. **Use a compatible MCP client** (like Claude Desktop with sampling support)
2. **Run the MUD-MCP server** - sampling is automatically detected
3. **Try the `talk` tool** with any NPC to see AI-generated dialogue
4. **Watch the logs** to see sampling requests in action

```bash
[Sampling] Handler registered
[Sampling] Requesting content generation: Player says: "Hello"...
[Sampling] Generated content with model: claude-3-sonnet
```

The future of text adventures is here - where every conversation is unique, every interaction tells a story, and your AI companion becomes part of the narrative magic! 🌟

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
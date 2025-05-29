# MUD MCP Server Specification

## Overview
This document defines the specifications for a stateful, interactive Multi-User Dungeon (MUD) server built using the Model Context Protocol (MCP) specification version 2025-03-26. The server dynamically adjusts prompts, tools, and resources based on game state, providing a responsive and immersive text-based gaming experience.

## Architecture
- **State Management**: The server maintains a global state for each player, including location, inventory, and quest progress.
- **Tools as Actions**: Players interact with the game by invoking tools, which modify the game state. Tools are model-controlled and require user approval.
- **Prompts as State Representation**: Prompts are user-controlled templates that dynamically display the current game state, adjusting based on the player's context.
- **Resources**: Game state data exposed as resources that can be read by clients and LLMs.
- **MCP Communication**: The server follows the MCP protocol (2025-03-26), allowing clients to interact with the game via JSON-RPC 2.0 requests.

---

## 1. Game State Representation
Each player has an independent state stored in the server:
```json
{
  "player_id": "12345",
  "room": "entrance",
  "inventory": [],
  "hasQuest": false,
  "monsterPresent": false
}
```
State updates occur via tools, while prompts reflect the current state.

---

## 2. Tools (Actions)

Tools represent executable functions that LLMs can invoke to interact with the game. Each tool is model-controlled and requires user approval before execution.

### Tool Discovery
The server exposes available tools through the `tools/list` endpoint:

```json
{
  "method": "tools/list",
  "result": {
    "tools": [
      {
        "name": "look",
        "description": "Examine your current surroundings",
        "inputSchema": {
          "type": "object",
          "properties": {},
          "required": []
        },
        "annotations": {
          "title": "Look Around",
          "readOnlyHint": true,
          "openWorldHint": false
        }
      },
      {
        "name": "move",
        "description": "Move to a different room",
        "inputSchema": {
          "type": "object",
          "properties": {
            "direction": {
              "type": "string",
              "enum": ["north", "south", "east", "west"],
              "description": "Direction to move"
            }
          },
          "required": ["direction"]
        },
        "annotations": {
          "title": "Move",
          "readOnlyHint": false,
          "destructiveHint": false,
          "idempotentHint": false,
          "openWorldHint": false
        }
      }
    ]
  }
}
```

### Tool Definitions

#### `look`
- **Description**: Provides a description of the player's current room
- **Input Schema**: No parameters required
- **Annotations**: Read-only, safe operation
- **Example Call**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "look",
      "arguments": {}
    }
  }
  ```
- **Example Response**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "content": [
        {
          "type": "text",
          "text": "You are at the dungeon entrance. Stone walls stretch up into darkness. A torch flickers on the wall, casting dancing shadows. Exits: North."
        }
      ]
    }
  }
  ```

#### `move`
- **Description**: Moves the player to a different room
- **Parameters**: `direction` (north, south, east, west)
- **Behavior**: Updates the player's `room` state if the move is valid
- **Error Handling**: Returns appropriate error if movement is invalid

#### `pick_up`
- **Description**: Adds an item to the player's inventory
- **Parameters**: `item` (string)
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Name of the item to pick up"
      }
    },
    "required": ["item"]
  }
  ```
- **Behavior**: Updates `inventory` if the item is present in the room
- **Annotations**: Not read-only, non-destructive operation

#### `battle`
- **Description**: Engages an enemy if present
- **Input Schema**: No parameters required
- **Behavior**: If `monsterPresent` is `true`, initiates combat; otherwise returns "No enemies here"
- **Annotations**: Potentially destructive operation that may affect player health

### Error Handling in Tools

Tools should handle errors gracefully using the `isError` flag:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "Error: Cannot move north - there is a wall blocking your path."
      }
    ]
  }
}
```

---

## 3. Prompts (State Representation)

Prompts are user-controlled templates that provide reusable workflows and contextual information based on game state.

### Prompt Discovery
The server exposes available prompts through the `prompts/list` endpoint:

```json
{
  "method": "prompts/list",
  "result": {
    "prompts": [
      {
        "name": "room_description",
        "description": "Get detailed description of current room and available actions",
        "arguments": [
          {
            "name": "include_inventory",
            "description": "Whether to include inventory in the description",
            "required": false
          }
        ]
      },
      {
        "name": "quest_prompt",
        "description": "View available quests and quest status",
        "arguments": []
      }
    ]
  }
}
```

### Prompt Definitions

#### `room_description`
- **Behavior**: Changes based on the player's current room and state
- **Arguments**: Optional `include_inventory` parameter
- **Example Request**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "prompts/get",
    "params": {
      "name": "room_description",
      "arguments": {
        "include_inventory": true
      }
    }
  }
  ```
- **Example Response**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 2,
    "result": {
      "description": "Detailed room description with current game state",
      "messages": [
        {
          "role": "user",
          "content": {
            "type": "text",
            "text": "You are in a dark hallway with stone walls. The air is musty and cold. Ancient torches provide flickering light. You can hear distant echoes from the north. Exits: South, East.\n\nInventory: leather pouch, rusty key"
          }
        }
      ]
    }
  }
  ```

#### `quest_prompt`
- **Behavior**: Only appears if the player has quest-related content available
- **Dynamic Content**: Changes based on quest state (available, active, completed)
- **Example Response**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 3,
    "result": {
      "description": "Current quest information and opportunities",
      "messages": [
        {
          "role": "user",
          "content": {
            "type": "text",
            "text": "A weathered note on the wall describes an ancient treasure hidden deep in the dungeon. The quest involves finding three magical keys and defeating the guardian. Do you wish to accept this quest?"
          }
        }
      ]
    }
  }
  ```

#### `battle_prompt`
- **Behavior**: Only available when `monsterPresent` is `true`
- **Context**: Provides combat-specific guidance and options
- **Dynamic Content**: Adapts based on enemy type and player capabilities

### Prompt Arguments and Validation

Prompts support typed arguments with validation:

```json
{
  "name": "game_help",
  "description": "Get help for specific game aspects",
  "arguments": [
    {
      "name": "topic",
      "description": "Help topic (combat, navigation, inventory)",
      "required": true
    },
    {
      "name": "detail_level",
      "description": "Level of detail (basic, advanced)",
      "required": false
    }
  ]
}
```

---

## 4. Resources

Resources expose game state data that can be read by clients and LLMs to understand the current game context.

### Resource Discovery
The server exposes available resources through the `resources/list` endpoint:

```json
{
  "method": "resources/list",
  "result": {
    "resources": [
      {
        "uri": "game://player/state",
        "name": "Player State",
        "description": "Current player status including location, inventory, and stats",
        "mimeType": "application/json"
      },
      {
        "uri": "game://world/map",
        "name": "World Map",
        "description": "Available rooms and their connections",
        "mimeType": "application/json"
      },
      {
        "uri": "game://room/current",
        "name": "Current Room",
        "description": "Detailed information about the current room",
        "mimeType": "application/json"
      }
    ]
  }
}
```

### Resource Reading
Clients can read resource content using the `resources/read` endpoint:

```json
{
  "method": "resources/read",
  "params": {
    "uri": "game://player/state"
  },
  "result": {
    "contents": [
      {
        "uri": "game://player/state",
        "mimeType": "application/json",
        "text": "{\"player_id\":\"12345\",\"room\":\"entrance\",\"inventory\":[\"rusty_key\"],\"health\":100,\"hasQuest\":true,\"monsterPresent\":false}"
      }
    ]
  }
}
```

## 5. Dynamic Updates
### Changing Prompts Based on State
- When a player enters a new area, `room_description` content is updated
- If a player accepts a quest, `quest_prompt` changes to show quest progress
- If an enemy appears, `battle_prompt` becomes available in the prompts list
- Server sends `notifications/prompts/list_changed` when prompt availability changes

### Changing Tools Based on State
- The `open_chest` tool only appears when the player is in a room with a chest
- The `battle` tool is only available when `monsterPresent` is `true`
- Context-specific tools are dynamically added/removed based on game state
- Server sends `notifications/tools/list_changed` when the toolset updates

### Changing Resources Based on State
- Player state resource updates whenever actions modify player data
- Room resources change when players move between locations
- World map resource reflects discovered areas and accessible paths
- Server can send resource update notifications to inform clients of changes

### Notifications to Clients
The server implements the following notification patterns:

```json
// Tools list changed
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}

// Prompts list changed  
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}

// Resources list changed
{
  "jsonrpc": "2.0", 
  "method": "notifications/resources/list_changed"
}

// Resource updated
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "game://player/state"
  }
}
```

---

## 6. Security & Trust Configuration

The MCP 2025-03-26 specification emphasizes security and user control:

### Key Security Principles

1. **User Consent and Control**
   - Users must explicitly consent to all data access and operations
   - Users retain control over what data is shared and what actions are taken
   - Clear UIs for reviewing and authorizing activities

2. **Data Privacy**
   - Explicit user consent required before exposing game state data
   - User data protected with appropriate access controls
   - No transmission of player data without consent

3. **Tool Safety**
   - Tools represent arbitrary code execution and must be treated with caution
   - Explicit user consent required before invoking any tool
   - Users understand what each tool does before authorization
   - Tool descriptions and annotations are considered untrusted unless from trusted servers

4. **Sampling Controls**
   - Users must explicitly approve any LLM sampling requests
   - Users control whether sampling occurs and what prompts are sent

### Implementation Guidelines

The server SHOULD:
- Build robust consent and authorization flows
- Provide clear documentation of security implications
- Implement appropriate access controls and data protections
- Follow security best practices in integrations
- Consider privacy implications in feature designs

### Trust Configuration
- Claude Desktop requires confirmation before executing tools
- No current mechanism to permanently trust an MCP server
- Each tool invocation requires user approval
- Prompts are user-controlled and explicitly selected by users

---

## 7. SDK and Implementation

### Official TypeScript SDK
Use the official TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk

### Server Capabilities Declaration
The server must declare its capabilities during initialization:

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true,
      "listChanged": true
    },
    "tools": {
      "listChanged": true
    },
    "prompts": {
      "listChanged": true
    }
  }
}
```

### Transport Layer
The server uses the MCP transport layer for message handling:
- JSON-RPC 2.0 message format
- Stateful connections between client and server
- Proper error handling and validation
- Support for notifications and subscriptions

### Best Practices

1. **Input Validation**
   - Validate all tool parameters against JSON Schema
   - Sanitize user input to prevent injection attacks
   - Validate resource URIs and prompt arguments

2. **Error Handling**
   - Use proper MCP error response format
   - Provide helpful error messages to users
   - Log errors for debugging while protecting sensitive data

3. **State Management**
   - Maintain consistent game state across requests
   - Handle concurrent access to shared game resources
   - Implement proper session management

4. **Performance**
   - Cache frequently accessed game data
   - Implement efficient resource subscription handling
   - Consider rate limiting for resource-intensive operations

## 8. Testing and Validation

### MCP Inspector
Use the MCP Inspector tool for testing: https://modelcontextprotocol.io/docs/tools/inspector

### Validation Checklist
- [ ] All tools properly define inputSchema with JSON Schema
- [ ] Tool responses use correct content structure
- [ ] Prompts support proper argument handling
- [ ] Resources are accessible via standard URIs
- [ ] Notifications are sent when state changes
- [ ] Error handling follows MCP patterns
- [ ] Security controls are properly implemented

## Conclusion

This specification outlines an interactive, state-driven MUD using the Model Context Protocol (2025-03-26 specification). By implementing:

- **Tools as model-controlled actions** that modify game state with proper input validation and user consent
- **Prompts as user-controlled templates** that represent game state with dynamic arguments and content
- **Resources as readable game data** that provide context to LLMs and clients
- **Dynamic notifications** that keep clients informed of state changes
- **Robust security controls** that protect user data and require explicit consent

We achieve a dynamic, responsive game environment that leverages the full capabilities of the modern MCP protocol while maintaining security and user control. The specification emphasizes the separation between model-controlled tools (requiring approval) and user-controlled prompts (explicitly selected), providing a safe and intuitive gaming experience within the MCP ecosystem.


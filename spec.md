# MUD MCP Server Specification

## Overview
This document defines the specifications for a stateful, interactive Multi-User Dungeon (MUD) server built using the Model Context Protocol (MCP). The server dynamically adjusts prompts, tools, and resources based on game state, providing a responsive and immersive text-based gaming experience.

## Architecture
- **State Management**: The server maintains a global state for each player, including location, inventory, and quest progress.
- **Tools as Actions**: Players interact with the game by invoking tools, which modify the game state.
- **Prompts as State Representation**: Prompts dynamically display the current game state, adjusting based on the player's context.
- **MCP Communication**: The server follows the MCP protocol, allowing clients to interact with the game via JSON-RPC requests.

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
### `look`
- **Description**: Provides a description of the player's current room.
- **Request**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": { "name": "look" }
  }
  ```
- **Response**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "content": [{ "type": "text", "text": "You are at the dungeon entrance. Exits: North." }]
    }
  }
  ```

### `move`
- **Description**: Moves the player to a different room.
- **Parameters**: `direction` (north, south, east, west)
- **Behavior**: Updates the player's `room` state if the move is valid.

### `pick_up`
- **Description**: Adds an item to the player's inventory.
- **Parameters**: `item`
- **Behavior**: Updates `inventory` if the item is present in the room.

### `battle`
- **Description**: Engages an enemy if present.
- **Behavior**: If `monsterPresent` is `true`, the player fights; otherwise, returns "No enemies here."

---

## 3. Prompts (State Representation)
### `room_description`
- **Behavior**: Changes based on the player's current room.
- **Response**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 2,
    "result": {
      "messages": [{ "role": "assistant", "content": { "type": "text", "text": "You are in a dark hallway. Exits: South, East." } }]
    }
  }
  ```

### `quest_prompt`
- **Behavior**: Only appears if the player has not accepted a quest.
- **Response**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 3,
    "result": {
      "messages": [{ "role": "assistant", "content": { "type": "text", "text": "A note on the wall describes a quest. Accept?" } }]
    }
  }
  ```

### `battle_prompt`
- **Behavior**: Only triggers if `monsterPresent` is `true`.

---

## 4. Dynamic Updates
### Changing Prompts Based on State
- When a player enters a new area, `room_description` is updated.
- If a player picks up a quest, `quest_prompt` is removed from available prompts.
- If an enemy appears, `battle_prompt` is added to available prompts.

### Changing Tools Based on State
- The `open_chest` tool only appears when the player is in the treasure room.
- The `battle` tool is only available when `monsterPresent` is `true`.

### Notifications to Clients
- The server sends `notifications/prompts/list_changed` when available prompts change.
- The server sends `notifications/tools/list_changed` when the toolset updates.

---

## 5. Security & Trust Configuration
- Claude Desktop requires confirmation before executing tools.
- No current mechanism to permanently trust an MCP server.

---

## SDK
Use the offical typescript SDK https://github.com/modelcontextprotocol/typescript-sdk

## Conclusion
This specification outlines an interactive, state-driven MUD using MCP. By treating tools as actions that modify state and prompts as the representation of state, we achieve a dynamic, responsive game environment within the constraints of the MCP protocol.


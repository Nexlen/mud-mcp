import { EventEmitter } from 'events';
import type { PlayerState, GameWorld, Session } from '../types/index.js';
import { initialGameWorld } from '../config/world.js';

class StateService extends EventEmitter {
  private players: Map<string, PlayerState> = new Map();
  private sessions: Map<string, Session> = new Map();
  private world: GameWorld;

  constructor() {
    super();
    this.world = initialGameWorld;
  }

  createSession(): Session {
    // TODO: Replace with actual session ID generation logic, stdio doesn generates a unique ID
    const sessionId = `session_1234`;
    const playerId = `player_${Date.now()}`;
    
    // Create initial player state
    const playerState: PlayerState = {
      player_id: playerId,
      room: 'entrance',
      inventory: [],
      hasQuest: false,
      monsterPresent: false
    };
    
    this.players.set(playerId, playerState);
    
    const session: Session = {
      id: sessionId,
      playerId,
      lastActive: new Date()
    };
    this.sessions.set(sessionId, session);
    
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getPlayerState(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }

  getWorld(): GameWorld {
    return this.world;
  }

  movePlayer(playerId: string, direction: string): boolean {
    const playerState = this.getPlayerState(playerId);
    if (!playerState) return false;

    const currentRoom = this.world.rooms[playerState.room];
    if (!currentRoom) return false;

    const nextRoomId = currentRoom.exits[direction];
    if (!nextRoomId) return false;

    const nextRoom = this.world.rooms[nextRoomId];
    if (!nextRoom) return false;

    // Update player location
    playerState.room = nextRoomId;

    // Update monster presence based on new room
    const hadMonster = playerState.monsterPresent;
    playerState.monsterPresent = nextRoom.monsters && nextRoom.monsters.length > 0;
    
    // Emit events for tool/prompt changes if needed
    if (hadMonster !== playerState.monsterPresent || nextRoom.items.length > 0) {
      this.emit('TOOLS_CHANGED', { playerId });
      this.emit('PROMPTS_CHANGED', { playerId });
    }

    return true;
  }

  addItemToInventory(playerId: string, itemId: string): boolean {
    const playerState = this.getPlayerState(playerId);
    if (!playerState) return false;

    const room = this.world.rooms[playerState.room];
    if (!room || !room.items.includes(itemId)) return false;

    // Add to inventory and remove from room
    playerState.inventory.push(itemId);
    room.items = room.items.filter(id => id !== itemId);

    if (room.items.length === 0) {
      // console.log(`All items collected in room`, { playerId });
      setTimeout(() => this.emit('TOOLS_CHANGED', { playerId }, 1));
    }

    // If this was a quest item, check if we need to update prompts
    if (itemId === 'ancient_artifact' && playerState.hasQuest) {
      this.emit('PROMPTS_CHANGED', { playerId });
    }

    return true;
  }

  acceptQuest(playerId: string): boolean {
    const playerState = this.getPlayerState(playerId);
    if (!playerState) return false;

    const room = this.world.rooms[playerState.room];
    if (!room || !room.hasQuest || playerState.hasQuest) return false;

    playerState.hasQuest = true;
    
    // Update available prompts since quest state changed
    this.emit('PROMPTS_CHANGED', { playerId });
    
    return true;
  }

  canBattle(playerId: string): boolean {
    const playerState = this.getPlayerState(playerId);
    if (!playerState || !playerState.monsterPresent) return false;

    const room = this.world.rooms[playerState.room];
    return room?.monsters?.length > 0 || false;
  }

  battle(playerId: string): { success: boolean; monsterName?: string } {
    const playerState = this.getPlayerState(playerId);
    if (!playerState || !playerState.monsterPresent) {
      return { success: false };
    }

    const room = this.world.rooms[playerState.room];
    if (!room || !room.monsters || room.monsters.length === 0) {
      return { success: false };
    }

    const monsterName = room.monsters[0];
    
    // 50% chance to win battle
    const success = Math.random() >= 0.5;
    if (success) {
      // Remove monster from room on victory
      room.monsters = room.monsters.filter(m => m !== monsterName);
      playerState.monsterPresent = false;
      
      // Update tools and prompts since battle state changed
      this.emit('TOOLS_CHANGED', { playerId });
      this.emit('PROMPTS_CHANGED', { playerId });
    }

    return { success, monsterName };
  }

  updatePlayerRoom(playerId: string, roomId: string): boolean {
    const playerState = this.getPlayerState(playerId);
    if (!playerState) return false;

    const targetRoom = this.world.rooms[roomId];
    if (!targetRoom) return false;

    const oldRoom = playerState.room;
    playerState.room = roomId;

    // Update monster presence based on new room
    const hadMonster = playerState.monsterPresent;
    playerState.monsterPresent = targetRoom.monsters && targetRoom.monsters.length > 0;
    
    // Emit events for tool/prompt changes if room changed significantly
    if (hadMonster !== playerState.monsterPresent || targetRoom.items.length > 0 || oldRoom !== roomId) {
      this.emit('TOOLS_CHANGED', { playerId });
      this.emit('PROMPTS_CHANGED', { playerId });
    }

    return true;
  }

  removeItemFromRoom(roomId: string, itemId: string): boolean {
    const room = this.world.rooms[roomId];
    if (!room || !room.items.includes(itemId)) return false;

    room.items = room.items.filter(id => id !== itemId);
    return true;
  }
}

export default new StateService();
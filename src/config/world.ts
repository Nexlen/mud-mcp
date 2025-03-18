import { GameWorld, Room, Item, Monster, Quest } from "../types/index.js";



export const initialRooms: { [roomId: string]: Room } = {
  'entrance': {
    id: 'entrance',
    name: 'Dungeon Entrance',
    description: 'You are at the entrance of a dark and foreboding dungeon. The stone walls glisten with moisture, and the air smells of earth and decay.',
    exits: {
      'north': 'hallway'
    },
    items: ['torch'],
    monsters: [],
    hasQuest: false
  },
  'hallway': {
    id: 'hallway',
    name: 'Dark Hallway',
    description: 'You are in a dark hallway. The walls are lined with ancient tapestries depicting epic battles.',
    exits: {
      'south': 'entrance',
      'east': 'chamber'
    },
    items: ['key'],
    monsters: [],
    hasQuest: true
  },
  'chamber': {
    id: 'chamber',
    name: 'Ancient Chamber',
    description: 'You stand in a vast chamber with a high ceiling. Pillars carved with runes support the structure.',
    exits: {
      'west': 'hallway',
      'north': 'treasure_room'
    },
    items: ['potion'],
    monsters: ['goblin'],
    hasQuest: false
  },
  'treasure_room': {
    id: 'treasure_room',
    name: 'Treasure Room',
    description: 'A room filled with treasure chests and valuable artifacts. Gold coins litter the floor.',
    exits: {
      'south': 'chamber'
    },
    items: ['gold'],
    monsters: ['dragon'],
    hasQuest: false
  }
};


export const initialGameWorld: GameWorld = {
  rooms: initialRooms,
  players: {
    'player1': {
      player_id: 'player1',
      room: 'entrance',
      inventory: [],
      hasQuest: false,
      monsterPresent: false
    }
  }
};

// Game items configuration
export const items: Record<string, Item> = {
  ancient_scroll: {
    name: 'Ancient Scroll',
    description: 'A weathered scroll with mysterious writings.'
  },
  golden_key: {
    name: 'Golden Key',
    description: 'A brilliantly crafted key that seems important.'
  },
  magic_gem: {
    name: 'Magic Gem',
    description: 'A glowing gem pulsing with magical energy.'
  }
};

// Game monsters configuration
export const monsters: Record<string, Monster> = {
  goblin: {
    name: 'Cave Goblin',
    description: 'A small but fierce goblin wielding a rusty dagger.',
    health: 20,
    damage: 5
  },
  dragon: {
    name: 'Ancient Dragon',
    description: 'A massive dragon with gleaming scales and fierce eyes.',
    health: 100,
    damage: 25
  }
};

// Game quests configuration
export const quests: Record<string, Quest> = {
  hallway_quest: {
    title: 'The Lost Artifact',
    description: 'Find the ancient artifact hidden in the dungeon. The writings speak of a powerful magical gem.',
    reward: 'Unlock new areas of the dungeon'
  }
};
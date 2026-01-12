import { ItemType, ItemDefinition, BoardType } from './types';

export const GRID_SIZE = 11;
export const DEPOT_GRID_SIZE = 5;
export const INITIAL_MONEY = 30;
export const TICK_RATE_MS = 33; // ~30 FPS for smooth droplets
export const RESOURCE_TICK_RATE_MS = 1000; // 1s for resource generation

export const DROPLET_SPEED = 2; // Progress per tick (0-100). 2 = 50 ticks to cross (1.6s).
export const DROPLET_SPAWN_INTERVAL = 5000; // ms

export const HOUSE_BASE_INCOME = 1;
export const HOUSE_SUPPLIED_MULTIPLIER = 1; // 1x income if watered (Base $1/droplet)

export const EXPANSION_COST = 1000;
export const LOCKED_ROWS_START = 4; // Rows 0-3 unlocked, 4-10 locked initially
export const LOCKED_DEPOT_ROWS_START = 2; // Rows 0-1 unlocked, 2-4 locked initially

export const DRAFT_REFRESH_COST = 10;

export const ITEMS: Record<ItemType, ItemDefinition> = {
  [ItemType.EMPTY]: {
    type: ItemType.EMPTY,
    name: 'Empty',
    cost: 0,
    description: 'Empty plot',
    board: BoardType.MAIN,
  },
  [ItemType.SOURCE]: {
    type: ItemType.SOURCE,
    name: 'Source',
    cost: 0,
    description: 'Water source',
    connections: ['S'],
    board: BoardType.MAIN,
  },
  [ItemType.HOUSE]: {
    type: ItemType.HOUSE,
    name: 'House',
    cost: 10,
    description: 'Generates income when water passes through.',
    connections: ['N', 'E', 'S', 'W'], // Connects all sides
    income: HOUSE_BASE_INCOME,
    board: BoardType.MAIN,
  },
  [ItemType.PIPE_STRAIGHT]: {
    type: ItemType.PIPE_STRAIGHT,
    name: 'Straight Pipe',
    cost: 2,
    description: 'Redirects water straight.',
    connections: ['N', 'S'],
    board: BoardType.MAIN,
  },
  [ItemType.PIPE_ELBOW]: {
    type: ItemType.PIPE_ELBOW,
    name: 'Elbow Pipe',
    cost: 3,
    description: 'Turns water 90 degrees.',
    connections: ['N', 'E'],
    board: BoardType.MAIN,
  },
  [ItemType.PIPE_TEE]: {
    type: ItemType.PIPE_TEE,
    name: 'T-Shape Pipe',
    cost: 5,
    description: 'Splits water three ways.',
    connections: ['N', 'E', 'W'],
    board: BoardType.MAIN,
  },
  [ItemType.PIPE_SPLIT_2]: {
    type: ItemType.PIPE_SPLIT_2,
    name: '2-Way Split',
    cost: 4,
    description: 'Splits water into two ways.',
    connections: ['N', 'E', 'W'],
    board: BoardType.MAIN,
  },
  [ItemType.PIPE_CROSS]: {
    type: ItemType.PIPE_CROSS,
    name: '4-Way Pipe',
    cost: 8,
    description: 'Splits water four ways.',
    connections: ['N', 'E', 'S', 'W'],
    board: BoardType.MAIN,
  },
  // DEPOT ITEMS
  [ItemType.DEPOT_PUMP]: {
    type: ItemType.DEPOT_PUMP,
    name: 'Water Pump',
    cost: 50,
    description: 'Increases droplet generation speed by 10%.',
    spawnRateBonus: 0.1,
    board: BoardType.DEPOT,
  },
  [ItemType.DEPOT_WELL]: {
    type: ItemType.DEPOT_WELL,
    name: 'Deep Well',
    cost: 25,
    description: 'Slowly refills water storage.',
    refillRate: 0.1,
    board: BoardType.DEPOT,
  },
  [ItemType.DEPOT_TANK]: {
    type: ItemType.DEPOT_TANK,
    name: 'Storage Tank',
    cost: 40,
    description: 'Increases maximum water capacity.',
    waterCap: 100,
    board: BoardType.DEPOT,
  },
};
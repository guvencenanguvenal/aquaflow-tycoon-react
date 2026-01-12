export type Direction = 'N' | 'E' | 'S' | 'W';

export enum ItemType {
  EMPTY = 'EMPTY',
  SOURCE = 'SOURCE',
  HOUSE = 'HOUSE',
  PIPE_STRAIGHT = 'PIPE_STRAIGHT',
  PIPE_ELBOW = 'PIPE_ELBOW',
  PIPE_TEE = 'PIPE_TEE',
  PIPE_SPLIT_2 = 'PIPE_SPLIT_2',
  PIPE_CROSS = 'PIPE_CROSS',
  // Depot Items
  DEPOT_PUMP = 'DEPOT_PUMP',
  DEPOT_WELL = 'DEPOT_WELL',
  DEPOT_TANK = 'DEPOT_TANK',
}

export enum BoardType {
  MAIN = 'MAIN',
  DEPOT = 'DEPOT',
}

export interface TileData {
  id: string; // unique ID for React keys
  x: number;
  y: number;
  type: ItemType;
  rotation: number; // 0, 90, 180, 270
  level: number; // Upgrade level, defaults to 1
  isWet: boolean; // Does it have water flowing? (Static connection check)
  isSupplied: boolean; // For houses: are they receiving water?
  flowIn: Direction[]; // Directions from which water enters this tile (Grid coordinates)
  flowOut: Direction[]; // Directions to which water leaves this tile (Grid coordinates)
  latestInteraction?: 'MERGE' | 'UPGRADE'; // Tracks how the last level change occurred
  isPrimary?: boolean; // For multi-tile items
  locked: boolean; // Is the tile locked?
}

export interface Droplet {
  id: string;
  x: number;
  y: number;
  progress: number; // 0 to 100 percentage through the tile
  fromDir: Direction | null; // The side of the tile entered from ('N' = Top edge)
  toDir: Direction | null; // The side exiting to
  hasSplit: boolean; // Flag to ensure we don't split multiple times at center
  hasPaid: boolean; // Flag to ensure house only pays once per droplet
}

export interface GameState {
  money: number;
  waterStored: number;
  maxWater: number;
  flowRate: number; // Calculated based on active pipes
  mainGrid: TileData[][];
  depotGrid: TileData[][];
  lastTick: number;
}

export interface ItemDefinition {
  type: ItemType;
  name: string;
  cost: number;
  description: string;
  connections?: Direction[]; // Base connections at rotation 0
  income?: number; // $/sec
  waterCap?: number; // Storage increase
  refillRate?: number; // Water/sec
  spawnRateBonus?: number; // Percentage increase in spawn speed (0.1 = 10%)
  board: BoardType;
  icon?: string;
}
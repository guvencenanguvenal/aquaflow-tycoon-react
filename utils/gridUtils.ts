import { GRID_SIZE, DEPOT_GRID_SIZE, LOCKED_ROWS_START, LOCKED_DEPOT_ROWS_START } from '../constants';
import { Direction, ItemType, TileData, BoardType } from '../types';
import { ITEMS } from '../constants';

export const createEmptyGrid = (boardType: BoardType): TileData[][] => {
  const size = boardType === BoardType.DEPOT ? DEPOT_GRID_SIZE : GRID_SIZE;
  const grid: TileData[][] = [];
  for (let y = 0; y < size; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < size; x++) {
      let type = ItemType.EMPTY;
      // Initialize Source at top center for MAIN board
      if (boardType === BoardType.MAIN && x === 5 && y === 0) {
        type = ItemType.SOURCE;
      }
      
      let locked = false;
      if (boardType === BoardType.MAIN) {
          locked = y >= LOCKED_ROWS_START;
      } else if (boardType === BoardType.DEPOT) {
          locked = y >= LOCKED_DEPOT_ROWS_START;
      }

      row.push({
        id: `${boardType}-${x}-${y}-${Date.now()}`,
        x,
        y,
        type,
        rotation: 0,
        level: 1,
        isWet: type === ItemType.SOURCE, // Source is always wet
        isSupplied: false,
        flowIn: [],
        flowOut: [],
        locked: locked,
      });
    }
    grid.push(row);
  }
  return grid;
};

// Helper to get connected directions based on rotation
export const getRotatedConnections = (baseConnections: Direction[] = [], rotation: number): Direction[] => {
  const directions: Direction[] = ['N', 'E', 'S', 'W'];
  const offset = rotation / 90; // 0, 1, 2, 3

  return baseConnections.map((dir) => {
    const currentIndex = directions.indexOf(dir);
    const newIndex = (currentIndex + offset) % 4;
    return directions[newIndex];
  });
};

const getOppositeDir = (dir: Direction): Direction => {
  switch (dir) {
    case 'N': return 'S';
    case 'S': return 'N';
    case 'E': return 'W';
    case 'W': return 'E';
  }
};

const getNeighborCoords = (x: number, y: number, dir: Direction): [number, number] | null => {
  let nx = x;
  let ny = y;
  if (dir === 'N') ny -= 1;
  if (dir === 'S') ny += 1;
  if (dir === 'E') nx += 1;
  if (dir === 'W') nx -= 1;

  if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
    return [nx, ny];
  }
  return null;
};

// Calculate valid outputs for a droplet entering a tile
export const getDropletOutputs = (type: ItemType, rotation: number, entryDir: Direction): Direction[] => {
    const def = ITEMS[type];
    
    // Source flows down by default (if used as a node)
    if (type === ItemType.SOURCE) return ['S'];

    // House Pass-Through logic: Enter N->Exit S, etc.
    if (type === ItemType.HOUSE || (type === 'TOWER' as ItemType)) {
        if (entryDir === 'N') return ['S'];
        if (entryDir === 'S') return ['N'];
        if (entryDir === 'E') return ['W'];
        if (entryDir === 'W') return ['E'];
        return [];
    }

    if (!def || !def.connections) return [];

    const connectedDirs = getRotatedConnections(def.connections, rotation);
    
    // Droplet must enter through a valid connection
    if (!connectedDirs.includes(entryDir)) return [];

    // Valid outputs are all other connections
    return connectedDirs.filter(d => d !== entryDir);
};

// BFS to simulate water flow (Static Connectivity)
export const simulateWaterFlow = (grid: TileData[][]): TileData[][] => {
  const newGrid = grid.map(row => row.map(tile => ({ 
      ...tile, 
      isWet: false, 
      isSupplied: false,
      flowIn: [],
      flowOut: []
  })));

  const queue: [number, number][] = [];
  const visited = new Set<string>();

  // Find source
  let startX = 5;
  let startY = 0;

  if (newGrid[startY][startX].type === ItemType.SOURCE) {
    newGrid[startY][startX].isWet = true;
    queue.push([startX, startY]);
    visited.add(`${startX},${startY}`);
  }

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const currentTile = newGrid[cy][cx];
    const def = ITEMS[currentTile.type];

    let connections: Direction[] = [];

    if (currentTile.type === ItemType.HOUSE || (currentTile.type === 'TOWER' as ItemType)) {
        const allDirs: Direction[] = ['N', 'E', 'S', 'W'];
        connections = allDirs.filter(dir => {
            const requiredInput = getOppositeDir(dir);
            return currentTile.flowIn.includes(requiredInput);
        });
    } else {
        if (!def.connections && currentTile.type !== ItemType.SOURCE) continue;
        connections = getRotatedConnections(def.connections, currentTile.rotation);
    }

    for (const dir of connections) {
      const neighbor = getNeighborCoords(cx, cy, dir);
      if (!neighbor) continue;
      
      const [nx, ny] = neighbor;
      const neighborTile = newGrid[ny][nx];
      const neighborKey = `${nx},${ny}`;
      const incomingDir = getOppositeDir(dir);

      // Check if neighbor is locked; if so, water cannot flow into it
      if (neighborTile.locked) continue;

      const neighborDef = ITEMS[neighborTile.type];
      if (neighborDef.connections) {
        const neighborCons = getRotatedConnections(neighborDef.connections, neighborTile.rotation);

        if (neighborCons.includes(incomingDir)) {
           const isHouseOrTower = neighborTile.type === ItemType.HOUSE || (neighborTile.type === 'TOWER' as ItemType);

           // Prevent multi-input for non-house tiles (Pipes)
           if (!isHouseOrTower && neighborTile.flowIn.length > 0 && !neighborTile.flowIn.includes(incomingDir)) {
               continue;
           }

           neighborTile.isWet = true;
           if (neighborTile.type === ItemType.HOUSE) {
               neighborTile.isSupplied = true;
           }

           if (!currentTile.flowOut.includes(dir)) currentTile.flowOut.push(dir);
           
           const isNewInput = !neighborTile.flowIn.includes(incomingDir);
           if (isNewInput) neighborTile.flowIn.push(incomingDir);

           if (!visited.has(neighborKey) || (isHouseOrTower && isNewInput)) {
             visited.add(neighborKey);
             queue.push([nx, ny]);
           }
        }
      }
    }
  }

  return newGrid;
};
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GRID_SIZE, DEPOT_GRID_SIZE, INITIAL_MONEY, ITEMS, TICK_RATE_MS, RESOURCE_TICK_RATE_MS, HOUSE_BASE_INCOME, HOUSE_SUPPLIED_MULTIPLIER, DROPLET_SPEED, DROPLET_SPAWN_INTERVAL, EXPANSION_COST, LOCKED_ROWS_START, DRAFT_REFRESH_COST } from './constants';
import { GameState, ItemType, BoardType, TileData, Direction, Droplet } from './types';
import { createEmptyGrid, simulateWaterFlow, getDropletOutputs } from './utils/gridUtils';
import { Tile } from './components/Tile';
import { playSound, setSoundEnabled } from './utils/soundUtils';
import { RotateCw, Trash2, Settings, Droplet as DropletIcon, Wallet, Coins, Info, Move, Hammer, X, TrendingUp, RefreshCw, Home, Activity, Pickaxe, Database, Volume2, VolumeX, Pause, Play, Lock, LockOpen, LogOut, AlertTriangle } from 'lucide-react';
import { TutorialOverlay, TutorialStep } from './components/TutorialOverlay';
import { MainMenu } from './components/MainMenu';
import { HowToPlayScreen } from './components/HowToPlayScreen';

interface DraftOption {
  id: string;
  type: ItemType;
  level: number;
}

type ViewState = 'MENU' | 'GAME' | 'HOW_TO_PLAY';

const App: React.FC = () => {
  // View State
  const [view, setView] = useState<ViewState>('MENU');

  // Game State
  const [money, setMoney] = useState(INITIAL_MONEY);
  const [waterStored, setWaterStored] = useState(100); // Start full (Base Capacity)
  const waterStoredRef = useRef(100);

  const [activeBoard, setActiveBoard] = useState<BoardType>(BoardType.MAIN);
  
  // Grids
  const [mainGrid, setMainGrid] = useState<TileData[][]>(() => simulateWaterFlow(createEmptyGrid(BoardType.MAIN)));
  const [depotGrid, setDepotGrid] = useState<TileData[][]>(() => createEmptyGrid(BoardType.DEPOT));

  // Droplets
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const lastSpawnTime = useRef<number>(0);

  // Tools
  const [selectedItemType, setSelectedItemType] = useState<ItemType | 'DELETE' | null>(null);
  
  // Drafting State
  const [draftSlots, setDraftSlots] = useState<DraftOption[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Selection / Inspection
  const [inspectedTile, setInspectedTile] = useState<{x: number, y: number, board: BoardType} | null>(null);

  // Drag & Drop State
  const [dragTarget, setDragTarget] = useState<{x: number, y: number} | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<ItemType | null>(null);
  const [draggedItemLevel, setDraggedItemLevel] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  // Tooltip State
  const [hoveredToolbarItem, setHoveredToolbarItem] = useState<{ type: ItemType, rect: DOMRect, level?: number } | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [toast, setToast] = useState<{msg: string, id: number} | null>(null);
  const [isSoundOn, setIsSoundOn] = useState(true);

  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('WELCOME');
  const [isTutorialActive, setIsTutorialActive] = useState(true);

  // Stats calculation refs
  const [stats, setStats] = useState({ income: 0, refill: 0, capacity: 100 });

  // Sync Ref with State
  useEffect(() => {
    waterStoredRef.current = waterStored;
  }, [waterStored]);

  // --- Inflation Logic ---
  const totalBuildings = useMemo(() => {
    let count = 0;
    mainGrid.forEach(row => row.forEach(t => {
      if (t.type !== ItemType.EMPTY && t.type !== ItemType.SOURCE) count++;
    }));
    depotGrid.forEach(row => row.forEach(t => {
      if (t.type !== ItemType.EMPTY) count++;
    }));
    return count;
  }, [mainGrid, depotGrid]);

  const inflationRate = totalBuildings * 0.05; // 5% per building

  const getAdjustedCost = useCallback((type: ItemType) => {
    const baseCost = ITEMS[type].cost;
    return Math.floor(baseCost * (1 + inflationRate));
  }, [inflationRate]);

  // --- Spawn Rate Logic ---
  const spawnRateMultiplier = useMemo(() => {
    let bonus = 0;
    depotGrid.forEach(row => row.forEach(tile => {
       const def = ITEMS[tile.type];
       if (def.spawnRateBonus) {
         bonus += def.spawnRateBonus * tile.level;
       }
    }));
    return 1 + bonus;
  }, [depotGrid]);

  const consumptionRate = useMemo(() => {
    // droplets per second = 1000ms / interval_ms
    // interval = DROPLET_SPAWN_INTERVAL / multiplier
    // so rate = multiplier / (DROPLET_SPAWN_INTERVAL / 1000)
    return spawnRateMultiplier / (DROPLET_SPAWN_INTERVAL / 1000);
  }, [spawnRateMultiplier]);

  // --- Drafting Logic ---
  const generateDraftOption = (): DraftOption => {
    const r = Math.random();
    let type = ItemType.PIPE_STRAIGHT;
    let level = 1;

    if (r < 0.40) {
        type = ItemType.HOUSE;
        if (Math.random() > 0.9) level = 2;
    } else if (r < 0.60) {
        type = ItemType.PIPE_STRAIGHT;
    } else if (r < 0.70) {
        type = ItemType.PIPE_ELBOW;
    } else if (r < 0.80) {
        type = ItemType.PIPE_TEE;
    } else if (r < 0.85) {
        type = ItemType.PIPE_CROSS;
    } else {
        type = ItemType.PIPE_SPLIT_2;
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        type,
        level
    };
  };

  const regenerateSlot = (index: number) => {
      setDraftSlots(prev => {
          const next = [...prev];
          next[index] = generateDraftOption();
          return next;
      });
  };

  const handleRefreshDrafts = () => {
    if (money < DRAFT_REFRESH_COST) {
        showToast(`Need $${DRAFT_REFRESH_COST} to refresh!`);
        return;
    }
    
    // Prevent refresh during critical tutorial steps to avoid soft-locking
    if (isTutorialActive && (tutorialStep === 'SELECT_PIPE' || tutorialStep === 'SELECT_HOUSE')) {
         showToast("Complete the tutorial step first!");
         return;
    }

    setMoney(prev => prev - DRAFT_REFRESH_COST);
    setDraftSlots([
        generateDraftOption(),
        generateDraftOption(),
        generateDraftOption()
    ]);
    playSound('place'); 
    
    if (selectedSlotIndex !== null) {
        setSelectedItemType(null);
        setSelectedSlotIndex(null);
    }
  };

  // Initialize Draft Slots
  useEffect(() => {
      if (draftSlots.length === 0) {
          const slots = [
              generateDraftOption(),
              generateDraftOption(),
              generateDraftOption()
          ];

          // Ensure at least one House and one Pipe in the first draft for Tutorial
          if (!slots.some(s => s.type === ItemType.HOUSE)) {
              slots[0] = {
                  id: Math.random().toString(36).substr(2, 9),
                  type: ItemType.HOUSE,
                  level: 1
              };
          }
           if (!slots.some(s => s.type.includes('PIPE'))) {
              slots[1] = {
                  id: Math.random().toString(36).substr(2, 9),
                  type: ItemType.PIPE_STRAIGHT,
                  level: 1
              };
          }
          
          setDraftSlots(slots);
      }
  }, [draftSlots.length]);

  // --- Helpers ---
  const showToast = (msg: string) => {
      setToast({ msg, id: Date.now() });
      setTimeout(() => setToast(null), 2000);
  };

  const toggleSound = () => {
    const newState = !isSoundOn;
    setIsSoundOn(newState);
    setSoundEnabled(newState);
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
      let nx = x, ny = y;
      if (dir === 'N') ny -= 1;
      if (dir === 'S') ny += 1;
      if (dir === 'E') nx += 1;
      if (dir === 'W') nx -= 1;
      
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) return [nx, ny];
      return null;
  };

  // --- Droplet Simulation ---
  const spawnDroplet = () => {
      const newDroplet: Droplet = {
          id: `drop-${Date.now()}`,
          x: 5,
          y: 0,
          progress: 50,
          fromDir: 'N',
          toDir: 'S',
          hasSplit: false,
          hasPaid: false
      };
      setDroplets(prev => [...prev, newDroplet]);
      playSound('water');
  };

  const updateDroplets = useCallback(() => {
      setDroplets(currentDroplets => {
          const nextDroplets: Droplet[] = [];
          const grid = mainGrid;

          let incomeGenerated = 0;

          currentDroplets.forEach(d => {
              let newD = { ...d };
              newD.progress += DROPLET_SPEED;
              
              if (newD.progress >= 50 && !newD.hasPaid) {
                   const tile = grid[newD.y][newD.x];
                   if (tile.type === ItemType.HOUSE) {
                       incomeGenerated += (HOUSE_BASE_INCOME * tile.level);
                       newD.hasPaid = true;
                   }
              }

              if (newD.progress >= 100) {
                  if (!newD.toDir) return; 

                  const nextCoords = getNeighborCoords(newD.x, newD.y, newD.toDir);
                  if (!nextCoords) return; 

                  const [nx, ny] = nextCoords;
                  const nextTile = grid[ny][nx];
                  const entryDir = getOppositeDir(newD.toDir); 
                  
                  if (!nextTile.flowIn.includes(entryDir)) {
                      return;
                  }

                  const outputs = getDropletOutputs(nextTile.type, nextTile.rotation, entryDir);

                  if (outputs.length === 0) return; 

                  newD.x = nx;
                  newD.y = ny;
                  newD.progress = 0;
                  newD.fromDir = entryDir;
                  newD.hasSplit = false;
                  newD.hasPaid = false;

                  if (outputs.length === 1) {
                      newD.toDir = outputs[0];
                      nextDroplets.push(newD);
                  } else {
                      outputs.forEach((outDir, idx) => {
                           nextDroplets.push({
                               ...newD,
                               id: `${newD.id}-split-${idx}-${Date.now()}`,
                               toDir: outDir
                           });
                      });
                  }
              } else {
                  nextDroplets.push(newD);
              }
          });
          
          if (incomeGenerated > 0) {
              setMoney(m => m + incomeGenerated);
              playSound('money');
              if (isTutorialActive && tutorialStep === 'EXPLAIN_INCOME') {
                  setTutorialStep('COMPLETE');
              }
          }
          
          return nextDroplets;
      });
  }, [mainGrid, isTutorialActive, tutorialStep]);


  // --- Game Loop ---
  useEffect(() => {
    if (isPaused || view !== 'GAME') return;
    
    const tick = setInterval(() => {
        const now = Date.now();
        const currentInterval = DROPLET_SPAWN_INTERVAL / spawnRateMultiplier;

        if (now - lastSpawnTime.current > currentInterval) {
             // Check water availability before spawning
            if (waterStoredRef.current >= 1) {
                spawnDroplet();
                setWaterStored(prev => Math.max(0, prev - 1));
                lastSpawnTime.current = now;
            }
        }
        updateDroplets();
    }, TICK_RATE_MS);

    return () => clearInterval(tick);
  }, [isPaused, updateDroplets, spawnRateMultiplier, view]);


  // --- Resource Loop ---
  useEffect(() => {
    if (isPaused || view !== 'GAME') return;

    const interval = setInterval(() => {
      let refillRate = 0;
      let capacity = 100;
      
      depotGrid.flat().forEach(tile => {
        const def = ITEMS[tile.type];
        if (def.refillRate) refillRate += def.refillRate * tile.level;
        if (def.waterCap) capacity += def.waterCap * tile.level;
      });

      let estimatedIncome = 0;
      mainGrid.flat().forEach(t => {
          if (t.type === ItemType.HOUSE && t.isSupplied) estimatedIncome += HOUSE_BASE_INCOME * t.level;
      });

      setStats({ income: estimatedIncome, refill: refillRate, capacity });
      
      setWaterStored(w => {
        let newWater = w + refillRate; 
        if (newWater > capacity) newWater = capacity;
        return newWater;
      });

    }, RESOURCE_TICK_RATE_MS);

    return () => clearInterval(interval);
  }, [depotGrid, mainGrid, isPaused, view]);


  // --- Actions ---

  const handleStartGame = () => {
    // Reset Everything
    setMoney(INITIAL_MONEY);
    setWaterStored(100);
    waterStoredRef.current = 100;
    setMainGrid(simulateWaterFlow(createEmptyGrid(BoardType.MAIN)));
    setDepotGrid(createEmptyGrid(BoardType.DEPOT));
    setDroplets([]);
    setDraftSlots([]); // This triggers the useEffect to regenerate fresh slots
    setTutorialStep('WELCOME');
    setIsTutorialActive(true);
    setStats({ income: 0, refill: 0, capacity: 100 });
    
    setView('GAME');
    setIsPaused(false);
  };

  const handleQuitToMenu = () => {
    setIsPaused(true);
    setView('MENU');
  };

  const attemptPlaceItem = (x: number, y: number, type: ItemType, level: number = 1, slotIndex?: number) => {
    // Tutorial Checks
    if (isTutorialActive) {
        if (tutorialStep === 'PLACE_PIPE') {
            // Must place pipe at (5,1)
            if (x !== 5 || y !== 1 || !type.includes('PIPE')) {
                showToast("Place the pipe directly below the source!");
                return;
            }
            // If success, logic proceeds, then we advance step
        } else if (tutorialStep === 'PLACE_HOUSE') {
             // Should place house connected (e.g., 5,2)
             // We can be lenient, but ideally 5,2
             if (type !== ItemType.HOUSE) return;
        } else if (tutorialStep !== 'COMPLETE' && tutorialStep !== 'EXPLAIN_INCOME') {
            // Block other actions during specific steps
            return;
        }
    }

    const targetGrid = activeBoard === BoardType.MAIN ? mainGrid : depotGrid;
    const currentTile = targetGrid[y][x];

    if (currentTile.locked) {
        showToast("Area locked! Click to unlock.");
        return;
    }

    const itemDef = ITEMS[type];

    if (itemDef.board !== activeBoard) {
        showToast(`Cannot place ${itemDef.name} here.`);
        return;
    }

    const isMerge = 
        type === ItemType.HOUSE && 
        currentTile.type === ItemType.HOUSE && 
        currentTile.level === level;

    if (currentTile.type !== ItemType.EMPTY && !isMerge) {
        showToast("Space already occupied.");
        return;
    }

    const currentCost = getAdjustedCost(type);
    if (money < currentCost) {
        showToast("Not enough funds!");
        return;
    }

    const setGrid = activeBoard === BoardType.MAIN ? setMainGrid : setDepotGrid;

    setMoney(m => m - currentCost);

    const newGrid = targetGrid.map(row => [...row]);
    
    if (isMerge) {
        newGrid[y][x] = {
            ...currentTile,
            level: currentTile.level + 1,
            latestInteraction: 'MERGE'
        };
        showToast(`Merged to Level ${currentTile.level + 1}!`);
        playSound('upgrade');
    } else {
        newGrid[y][x] = { 
            ...currentTile, 
            type: type, 
            rotation: 0, 
            level: level,
            isWet: false, 
            isSupplied: false,
            flowIn: [],
            flowOut: []
        };
        showToast(`Placed ${itemDef.name}`);
        playSound('place');
    }
    
    if (activeBoard === BoardType.MAIN) {
        setGrid(simulateWaterFlow(newGrid));
    } else {
        setGrid(newGrid);
    }
    
    setInspectedTile(null);
    if (slotIndex !== undefined) {
        regenerateSlot(slotIndex);
        setSelectedItemType(null);
        setSelectedSlotIndex(null);
    }

    // Advance Tutorial
    if (isTutorialActive) {
        if (tutorialStep === 'PLACE_PIPE') {
            setTutorialStep('SELECT_HOUSE');
        } else if (tutorialStep === 'PLACE_HOUSE') {
            setTutorialStep('EXPLAIN_INCOME');
        }
    }
  };

  const attemptMoveItem = (ox: number, oy: number, tx: number, ty: number) => {
      if (isTutorialActive) return; // Disable moving during tutorial for simplicity

      if (ox === tx && oy === ty) return;

      const targetGrid = activeBoard === BoardType.MAIN ? mainGrid : depotGrid;
      const setGrid = activeBoard === BoardType.MAIN ? setMainGrid : setDepotGrid;
      
      const sourceTile = targetGrid[oy][ox];
      const targetTile = targetGrid[ty][tx];

      if (sourceTile.locked || targetTile.locked) {
          showToast("Area Locked!");
          return;
      }

      const isMerge = 
          sourceTile.type === ItemType.HOUSE && 
          targetTile.type === ItemType.HOUSE && 
          sourceTile.level === targetTile.level;

      if (targetTile.type !== ItemType.EMPTY && !isMerge) {
          showToast("Target space occupied");
          return;
      }

      const newGrid = targetGrid.map(row => [...row]);
      
      if (isMerge) {
           newGrid[ty][tx] = {
               ...targetTile,
               level: targetTile.level + 1,
               latestInteraction: 'MERGE'
           };
           showToast(`Merged to Level ${targetTile.level + 1}!`);
           playSound('upgrade');
      } else {
          newGrid[ty][tx] = { ...sourceTile, x: tx, y: ty };
          showToast("Item moved");
          playSound('place');
      }
      
      newGrid[oy][ox] = { 
        id: `empty-${ox}-${oy}-${Date.now()}`,
        x: ox, 
        y: oy, 
        type: ItemType.EMPTY, 
        rotation: 0, 
        level: 1,
        isWet: false, 
        isSupplied: false,
        flowIn: [], 
        flowOut: [],
        locked: false 
      };

      if (activeBoard === BoardType.MAIN) {
          setGrid(simulateWaterFlow(newGrid));
      } else {
          setGrid(newGrid);
      }
  };

  const handleTileClick = (x: number, y: number) => {
    const targetGrid = activeBoard === BoardType.MAIN ? mainGrid : depotGrid;
    const currentTile = targetGrid[y][x];

    if (currentTile.locked) {
        if (money >= EXPANSION_COST) {
            setMoney(m => m - EXPANSION_COST);
            const newGrid = targetGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, locked: false };
            if (activeBoard === BoardType.MAIN) {
                setMainGrid(simulateWaterFlow(newGrid));
            } else {
                setDepotGrid(newGrid);
            }
            playSound('upgrade');
            showToast("Tile Unlocked!");
        } else {
             showToast(`Need $${EXPANSION_COST} to unlock tile`);
             playSound('delete');
        }
        return;
    }

    if (currentTile.type === ItemType.SOURCE) return;

    if (selectedItemType === 'DELETE') {
        // Prevent deleting during tutorial
        if (isTutorialActive) return;

        const setGrid = activeBoard === BoardType.MAIN ? setMainGrid : setDepotGrid;
        if (currentTile.type === ItemType.EMPTY) return;
        
        const def = ITEMS[currentTile.type];
        const refund = Math.floor(def.cost / 2); 
        
        setMoney(m => m + refund);
        showToast(`Demolished ${def.name}. +$${refund}`);
        playSound('delete');

        const newGrid = [...targetGrid];
        newGrid[y] = [...newGrid[y]];
        newGrid[y][x] = { 
            ...currentTile, 
            type: ItemType.EMPTY, 
            rotation: 0, 
            level: 1,
            isWet: false, 
            isSupplied: false,
            flowIn: [],
            flowOut: []
        };
        
        if (activeBoard === BoardType.MAIN) {
             setGrid(simulateWaterFlow(newGrid));
        } else {
             setGrid(newGrid);
        }
        setInspectedTile(null);
        return;
    }

    if (selectedItemType) {
         if (activeBoard === BoardType.MAIN && selectedSlotIndex !== null) {
             const option = draftSlots[selectedSlotIndex];
             if (option.type === selectedItemType) {
                 attemptPlaceItem(x, y, selectedItemType, option.level, selectedSlotIndex);
                 return;
             }
         } else {
             attemptPlaceItem(x, y, selectedItemType);
         }
         return;
    }

    if (currentTile.type !== ItemType.EMPTY) {
        setInspectedTile({ x, y, board: activeBoard });
    } else {
        setInspectedTile(null);
    }
  };

  const rotateTile = (x: number, y: number, grid: TileData[][], setGrid: React.Dispatch<React.SetStateAction<TileData[][]>>) => {
      const currentTile = grid[y][x];
      if (currentTile.locked) return;
      if (!currentTile.type.includes('PIPE')) return;

      const newGrid = [...grid];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = { ...newGrid[y][x], rotation: (newGrid[y][x].rotation + 90) % 360 };
      
      if (activeBoard === BoardType.MAIN) {
          setGrid(simulateWaterFlow(newGrid));
      } else {
          setGrid(newGrid);
      }
  };

  const handleContextMenu = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    const targetGrid = activeBoard === BoardType.MAIN ? mainGrid : depotGrid;
    const setGrid = activeBoard === BoardType.MAIN ? setMainGrid : setDepotGrid;
    if (targetGrid[y][x].type !== ItemType.EMPTY && targetGrid[y][x].type !== ItemType.SOURCE && !targetGrid[y][x].locked) {
        rotateTile(x, y, targetGrid, setGrid);
    }
  };

  const handleUpgrade = () => {
      if (!inspectedTile) return;
      const { x, y, board } = inspectedTile;
      const targetGrid = board === BoardType.MAIN ? mainGrid : depotGrid;
      const setGrid = board === BoardType.MAIN ? setMainGrid : setDepotGrid;
      const tile = targetGrid[y][x];
      const def = ITEMS[tile.type];

      const upgradeCost = Math.floor(def.cost * (tile.level + 1));

      if (money < upgradeCost) {
          showToast("Not enough funds to upgrade!");
          return;
      }

      setMoney(m => m - upgradeCost);

      const newGrid = targetGrid.map(row => [...row]);
      newGrid[y][x] = { 
          ...tile, 
          level: tile.level + 1,
          latestInteraction: 'UPGRADE'
      };
      
      if (board === BoardType.MAIN) {
        setGrid(simulateWaterFlow(newGrid));
      } else {
        setGrid(newGrid);
      }
      showToast(`Upgraded to Level ${tile.level + 1}!`);
      playSound('upgrade');
  };

  // --- Tutorial Steps Control ---
  const handleNextStep = () => {
    if (tutorialStep === 'WELCOME') setTutorialStep('INTRO_SOURCE');
    else if (tutorialStep === 'INTRO_SOURCE') setTutorialStep('SELECT_PIPE');
    else if (tutorialStep === 'EXPLAIN_INCOME') setTutorialStep('COMPLETE');
  };
  
  const handleSkipTutorial = () => {
    setIsTutorialActive(false);
  };

  const handleDraftClick = (type: ItemType, index: number, cost: number) => {
      if (money < cost) return;

      // Tutorial Logic
      if (isTutorialActive) {
          if (tutorialStep === 'SELECT_PIPE') {
              if (type.includes('PIPE')) {
                  setTutorialStep('PLACE_PIPE');
              } else {
                  return; // Force selecting pipe
              }
          } else if (tutorialStep === 'SELECT_HOUSE') {
              if (type === ItemType.HOUSE) {
                  setTutorialStep('PLACE_HOUSE');
              } else {
                  return;
              }
          } else if (tutorialStep !== 'COMPLETE') {
              // Block clicking during other steps (like intro or place phase)
              return; 
          }
      }

      setSelectedItemType(type);
      setSelectedSlotIndex(index);
      setInspectedTile(null);
  };

  // --- Drag & Drop ---
  const handleToolbarDragStart = (e: React.DragEvent, type: ItemType, level: number = 1, slotIndex?: number) => {
    e.stopPropagation(); // Prevent propagation
    if (isTutorialActive) {
        e.preventDefault();
        return; // Disable drag during tutorial for simpler flow
    }
    
    isDraggingRef.current = true;

    // Set data synchronously to ensure it's available
    e.dataTransfer.setData('aquaflow/toolbar', 'true');
    e.dataTransfer.setData('source', 'toolbar');
    e.dataTransfer.setData('itemType', type);
    e.dataTransfer.setData('itemLevel', level.toString());
    if (slotIndex !== undefined) {
        e.dataTransfer.setData('slotIndex', slotIndex.toString());
    }
    // Construction from toolbar is a copy operation
    e.dataTransfer.effectAllowed = 'copy';

    // Defer state updates to avoid re-rendering while drag is initializing (Chrome fix)
    setTimeout(() => {
        setHoveredToolbarItem(null); 
        setDraggedItemType(type);
        setDraggedItemLevel(level);
    }, 20); // Slightly increased timeout for Chrome stability
  };

  const handleToolbarMouseEnter = (e: React.MouseEvent, type: ItemType, level: number = 1) => {
      if (isDraggingRef.current) return;
      setHoveredToolbarItem({
          type,
          level,
          rect: e.currentTarget.getBoundingClientRect()
      });
  };

  const handleToolbarMouseLeave = () => {
      if (isDraggingRef.current) return;
      setHoveredToolbarItem(null);
  };

  const handleGridDragStart = (e: React.DragEvent, x: number, y: number) => {
      e.stopPropagation();
      if (isTutorialActive) {
          e.preventDefault();
          return;
      }
      const tile = activeBoard === BoardType.MAIN ? mainGrid[y][x] : depotGrid[y][x];
      
      if (tile.locked || tile.type === ItemType.EMPTY || tile.type === ItemType.SOURCE) {
          e.preventDefault();
          return;
      }

      isDraggingRef.current = true;
      
      e.dataTransfer.setData('aquaflow/grid', 'true');
      e.dataTransfer.setData('source', 'grid');
      e.dataTransfer.setData('originX', x.toString());
      e.dataTransfer.setData('originY', y.toString());
      // Moving items within grid is a move operation
      e.dataTransfer.effectAllowed = 'move';
      
      // Defer state updates (Chrome fix)
      setTimeout(() => {
          setDraggedItemType(tile.type);
          setDraggedItemLevel(tile.level);
          setInspectedTile(null);
      }, 20);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setDragTarget(null);
    setDraggedItemType(null);
    setDraggedItemLevel(null);
  };

  const handleDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    const tile = activeBoard === BoardType.MAIN ? mainGrid[y][x] : depotGrid[y][x];
    if (tile.locked) {
        e.dataTransfer.dropEffect = 'none';
        setDragTarget(null);
        return;
    }
    
    // Safely check types and determine allowed effect
    // We must match the dropEffect to what is allowed by the source
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('aquaflow/grid')) {
        e.dataTransfer.dropEffect = 'move';
    } else if (types.includes('aquaflow/toolbar')) {
        e.dataTransfer.dropEffect = 'copy';
    } else {
        e.dataTransfer.dropEffect = 'none';
    }
    
    if (dragTarget?.x !== x || dragTarget?.y !== y) {
        setDragTarget({x, y});
    }
  };

  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
      e.preventDefault();
      setDragTarget(null);
      setDraggedItemType(null);
      setDraggedItemLevel(null);

      const targetGrid = activeBoard === BoardType.MAIN ? mainGrid : depotGrid;
      if (targetGrid[y][x].locked) return;
      
      const source = e.dataTransfer.getData('source');
      if (!source) return;

      if (source === 'toolbar') {
          const type = e.dataTransfer.getData('itemType') as ItemType;
          const level = parseInt(e.dataTransfer.getData('itemLevel')) || 1;
          const slotIndexStr = e.dataTransfer.getData('slotIndex');
          const slotIndex = slotIndexStr && slotIndexStr !== "" ? parseInt(slotIndexStr) : undefined;
          if (!type || !ITEMS[type]) return;
          attemptPlaceItem(x, y, type, level, slotIndex);

      } else if (source === 'grid') {
          const originX = parseInt(e.dataTransfer.getData('originX'));
          const originY = parseInt(e.dataTransfer.getData('originY'));
          if (isNaN(originX) || isNaN(originY)) return;
          attemptMoveItem(originX, originY, x, y);
      }
  };

  // --- Rendering ---
  if (view === 'MENU') {
      return <MainMenu onPlay={handleStartGame} onHowToPlay={() => setView('HOW_TO_PLAY')} />;
  }

  if (view === 'HOW_TO_PLAY') {
      return <HowToPlayScreen onBack={() => setView('MENU')} />;
  }

  const getHouseIconClass = (level: number) => {
      switch(level) {
          case 1: return 'text-green-400';
          case 2: return 'text-blue-400';
          case 3: return 'text-purple-400';
          case 4: return 'text-amber-400';
          default: return 'text-rose-400';
      }
  };

  const renderDraftSlot = (option: DraftOption, index: number) => {
      const def = ITEMS[option.type];
      const currentCost = getAdjustedCost(option.type);
      const isAffordable = money >= currentCost;
      const isSelected = selectedItemType === option.type && selectedSlotIndex === index;
      
      // Tutorial Highlight Logic
      let isTutorialTarget = false;
      if (isTutorialActive) {
          if (tutorialStep === 'SELECT_PIPE' && option.type.includes('PIPE')) isTutorialTarget = true;
          if (tutorialStep === 'SELECT_HOUSE' && option.type === ItemType.HOUSE) isTutorialTarget = true;
      }

      return (
        <div
            key={option.id}
            draggable={isAffordable}
            onDragStart={(e) => handleToolbarDragStart(e, option.type, option.level, index)}
            onDragEnd={handleDragEnd}
            onClick={() => handleDraftClick(option.type, index, currentCost)}
            onMouseEnter={(e) => handleToolbarMouseEnter(e, option.type, option.level)}
            onMouseLeave={handleToolbarMouseLeave}
            className={`
                flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 w-full h-24 relative
                ${isSelected ? 'border-yellow-400 bg-slate-800 -translate-y-1 shadow-lg' : 'border-slate-700 bg-slate-900'}
                ${!isAffordable 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-slate-800 cursor-grab active:cursor-grabbing'
                }
                ${isTutorialTarget ? 'ring-4 ring-blue-500 animate-pulse z-50 bg-slate-800' : ''}
            `}
        >
            <div className="text-2xl mb-1 pointer-events-none relative">
                 {option.type === ItemType.HOUSE && <Home className={getHouseIconClass(option.level)} />}
                 {option.type.includes('PIPE') && <RotateCw className="text-blue-400" />} 
            </div>
            
            <span className="text-xs font-bold text-center leading-tight pointer-events-none select-none">{def.name}</span>
            <span className={`text-xs font-mono font-bold mt-1 pointer-events-none select-none ${isAffordable ? 'text-green-300' : 'text-red-400'}`}>${currentCost}</span>
        </div>
      );
  };

  const renderDepotItem = (type: ItemType) => {
    const def = ITEMS[type];
    const currentCost = getAdjustedCost(type);
    const isAffordable = money >= currentCost;
    const isSelected = selectedItemType === type;
    
    let icon;
    switch(type) {
        case ItemType.DEPOT_PUMP: icon = <Activity className="text-yellow-400" />; break;
        case ItemType.DEPOT_WELL: icon = <Pickaxe className="text-emerald-400" />; break;
        case ItemType.DEPOT_TANK: icon = <Database className="text-cyan-400" />; break;
        default: icon = <Settings className="text-slate-400" />;
    }

    return (
        <div
            key={type}
            draggable={isAffordable}
            onDragStart={(e) => handleToolbarDragStart(e, type)}
            onDragEnd={handleDragEnd}
            onClick={() => { setSelectedItemType(type); setSelectedSlotIndex(null); setInspectedTile(null); }}
            onMouseEnter={(e) => handleToolbarMouseEnter(e, type)}
            onMouseLeave={handleToolbarMouseLeave}
            className={`
                flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 w-full h-24 relative
                ${isSelected ? 'border-yellow-400 bg-slate-800 -translate-y-1 shadow-lg' : 'border-slate-700 bg-slate-900'}
                ${!isAffordable 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-slate-800 cursor-grab active:cursor-grabbing'
                }
            `}
        >
            <div className="text-2xl mb-1 pointer-events-none">
                 {icon}
            </div>
            <span className="text-xs font-bold text-center leading-tight pointer-events-none select-none">{def.name}</span>
            <span className="text-xs text-green-300 mt-1 pointer-events-none select-none">${currentCost}</span>
        </div>
    );
  };

  const renderInspectionPanel = () => {
      if (!inspectedTile) return null;
      const { x, y, board } = inspectedTile;
      const grid = board === BoardType.MAIN ? mainGrid : depotGrid;
      
      if (!grid[y] || !grid[y][x]) return null;
      
      const tile = grid[y][x];
      const def = ITEMS[tile.type];

      if (tile.type === ItemType.EMPTY || tile.type === ItemType.SOURCE) return null;

      const upgradeCost = Math.floor(def.cost * (tile.level + 1));
      const canAfford = money >= upgradeCost;
      const isUpgradeable = def.board === BoardType.DEPOT || def.type === ItemType.HOUSE;

      return (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl z-40 animate-fade-in">
              <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-white">{def.name}</h3>
                  <button onClick={() => setInspectedTile(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-blue-300">Level {tile.level}</span>
                  {isUpgradeable && <span className="text-xs text-slate-400">Scaling: {tile.level}x stats</span>}
              </div>

              <div className="text-sm text-slate-300 mb-4 space-y-1">
                  <p>{def.description}</p>
                  {def.refillRate && (
                       <div className="flex justify-between text-emerald-400">
                           <span>Refill Rate:</span>
                           <span>+{def.refillRate * tile.level}/s <span className="text-xs text-slate-500">&rarr; +{def.refillRate * (tile.level + 1)}/s</span></span>
                       </div>
                  )}
                  {def.waterCap && (
                       <div className="flex justify-between text-blue-400">
                           <span>Capacity:</span>
                           <span>+{def.waterCap * tile.level} <span className="text-xs text-slate-500">&rarr; +{def.waterCap * (tile.level + 1)}</span></span>
                       </div>
                  )}
                  {def.income && (
                       <div className="flex justify-between text-green-400">
                           <span>Income:</span>
                           <span>${def.income * tile.level}/drop <span className="text-xs text-slate-500">&rarr; ${def.income * (tile.level + 1)}/drop</span></span>
                       </div>
                  )}
                  {def.spawnRateBonus && (
                       <div className="flex justify-between text-yellow-400">
                           <span>Speed:</span>
                           <span>+{Math.round(def.spawnRateBonus * tile.level * 100)}% <span className="text-xs text-slate-500">&rarr; +{Math.round(def.spawnRateBonus * (tile.level + 1) * 100)}%</span></span>
                       </div>
                  )}
              </div>

              {isUpgradeable ? (
                  <button 
                    onClick={handleUpgrade}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded font-bold flex items-center justify-center gap-2 transition-all
                        ${canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                    `}
                  >
                      <Hammer size={16} />
                      Upgrade (${upgradeCost})
                  </button>
              ) : (
                  <div className="text-center text-xs text-slate-500 italic">No upgrades available</div>
              )}
          </div>
      );
  };

  const renderTooltip = () => {
      if (!hoveredToolbarItem) return null;
      const { type, rect, level } = hoveredToolbarItem;
      const def = ITEMS[type];
      if (!def) return null;

      const currentCost = getAdjustedCost(type);
      const top = rect.top + (rect.height / 2);
      const left = rect.right + 12; 

      return (
        <div 
            className="fixed z-50 w-64 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl pointer-events-none animate-fade-in"
            style={{ top: top, left: left, transform: 'translateY(-50%)' }}
        >
            <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-3 h-3 bg-slate-800 border-l border-b border-slate-600 rotate-45"></div>
            
            <div className="relative">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-white text-lg leading-tight">{def.name} {level && level > 1 ? `(Lv${level})` : ''}</span>
                    <span className="font-mono text-green-400 font-bold bg-green-900/30 px-1.5 py-0.5 rounded text-xs">${currentCost}</span>
                </div>
                <div className="text-xs text-slate-300 leading-snug mb-3 border-b border-slate-700 pb-2">{def.description}</div>
                
                <div className="space-y-1">
                    {inflationRate > 0 && (
                        <div className="flex items-center justify-between text-xs text-red-400 mb-2 font-mono">
                            <span>Inflation</span>
                            <span>+{Math.round(inflationRate * 100)}%</span>
                        </div>
                    )}
                    {def.income && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Base Income</span>
                            <span className="font-mono text-blue-300">+{def.income}/s</span>
                        </div>
                    )}
                    {type === ItemType.HOUSE && (
                         <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Income/Drop</span>
                            <span className="font-mono text-yellow-300">${HOUSE_BASE_INCOME * (level || 1)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  };

  const depotItems = Object.values(ITEMS).filter(item => 
    item.board === BoardType.DEPOT
  );

  const activeGrid = activeBoard === BoardType.MAIN ? mainGrid : depotGrid;
  const currentGridSize = activeBoard === BoardType.MAIN ? GRID_SIZE : DEPOT_GRID_SIZE;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-md z-20">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg">
                <DropletIcon className="text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white">AquaFlow Tycoon</h1>
                <div className="flex gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><DropletIcon size={14} /> Est. Income: ${stats.income}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-8">
             <div className="flex items-center gap-2">
                 <button 
                     onClick={() => setIsPaused(!isPaused)} 
                     className={`p-2 rounded-full transition-colors ${isPaused ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                     title={isPaused ? "Resume Simulation" : "Pause Simulation"}
                 >
                    {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                 </button>

                 <button 
                     onClick={toggleSound} 
                     className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                     title={isSoundOn ? "Mute Sounds" : "Enable Sounds"}
                 >
                    {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                 </button>

                 <button 
                     onClick={handleQuitToMenu}
                     className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors ml-2"
                     title="Quit to Menu"
                 >
                    <LogOut size={20} />
                 </button>
             </div>
             
             <div className="flex flex-col items-end">
                <span className="text-xs uppercase font-semibold text-slate-500">Capital</span>
                <div className="flex items-center gap-2">
                    {inflationRate > 0 && (
                        <div className="flex items-center text-xs text-red-400 bg-red-900/10 px-1.5 py-0.5 rounded" title="Inflation Rate">
                            <TrendingUp size={12} className="mr-1" />
                            +{Math.round(inflationRate * 100)}%
                        </div>
                    )}
                    <span className="text-2xl font-mono text-green-400 font-bold">${money}</span>
                </div>
            </div>
            <div className="flex flex-col items-end min-w-[100px]">
                <div className="flex items-center gap-2">
                    {stats.refill < consumptionRate && (
                         <div className="text-amber-500 animate-pulse cursor-help" title={`Warning: Net Loss! Usage: ${consumptionRate.toFixed(2)}/s, Refill: ${stats.refill}/s`}>
                             <AlertTriangle size={14} />
                         </div>
                    )}
                    <span className="text-xs uppercase font-semibold text-slate-500">Water Tank</span>
                </div>
                <div className="w-full bg-slate-800 h-4 rounded-full mt-1 overflow-hidden relative">
                    <div 
                        className={`bg-blue-500 h-full transition-all duration-500 ease-out ${stats.refill < consumptionRate ? 'bg-amber-500/80' : 'bg-blue-500'}`}
                        style={{ width: `${(waterStored / stats.capacity) * 100}%` }}
                    />
                </div>
                <span className="text-xs text-blue-300 mt-1">{Math.floor(waterStored)} / {stats.capacity}L</span>
            </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
            <div className="p-4 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Regions</h3>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => { setActiveBoard(BoardType.MAIN); setSelectedItemType(null); setInspectedTile(null); }}
                        className={`p-3 rounded-lg text-left font-medium transition-colors flex items-center justify-between ${activeBoard === BoardType.MAIN ? 'bg-slate-700 text-white border border-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    >
                        <span>Pipeline City</span>
                        {activeBoard === BoardType.MAIN && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
                    </button>
                    <button 
                        onClick={() => { setActiveBoard(BoardType.DEPOT); setSelectedItemType(null); setInspectedTile(null); }}
                        className={`p-3 rounded-lg text-left font-medium transition-colors flex items-center justify-between ${activeBoard === BoardType.DEPOT ? 'bg-slate-700 text-white border border-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    >
                        <span>Water Depot</span>
                        {activeBoard === BoardType.DEPOT && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between h-8">
                    <div className="flex items-center gap-2">
                        Construction 
                    </div>
                    {activeBoard === BoardType.MAIN && (
                        <button 
                            onClick={handleRefreshDrafts}
                            disabled={money < DRAFT_REFRESH_COST}
                            className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border transition-all ${
                                money >= DRAFT_REFRESH_COST 
                                ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400' 
                                : 'border-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                            title={`Refresh Drafts (-$${DRAFT_REFRESH_COST})`}
                        >
                            <RefreshCw size={12} className={money >= DRAFT_REFRESH_COST ? "group-hover:rotate-180 transition-transform duration-500" : ""} />
                            Refresh ${DRAFT_REFRESH_COST}
                        </button>
                    )}
                </h3>
                
                {activeBoard === BoardType.MAIN ? (
                    <div className="grid grid-cols-3 gap-2">
                        {draftSlots.map((option, idx) => renderDraftSlot(option, idx))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                         {depotItems.map(item => renderDepotItem(item.type))}
                    </div>
                )}
                
                <div className="mt-6 border-t border-slate-800 pt-4 flex flex-col gap-2">
                     <button
                        onClick={() => { setSelectedItemType('DELETE'); setInspectedTile(null); }}
                        className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-red-900/50 text-red-400 font-bold transition-all ${selectedItemType === 'DELETE' ? 'bg-red-900/20 ring-2 ring-red-500' : 'hover:bg-red-900/10'}`}
                    >
                        <Trash2 size={18} /> Demolish
                    </button>
                </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 text-xs text-slate-500 leading-relaxed">
                <p className="flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    Right-click to rotate. Click to Select/Inspect. Drag to move.
                </p>
            </div>
        </aside>

        <main className="flex-1 bg-slate-950 flex items-center justify-center relative overflow-hidden">
            <div 
                className="relative p-8 bg-slate-900/50 rounded-xl shadow-2xl border border-slate-800"
                onDragLeave={() => { setDragTarget(null); setDraggedItemType(null); setDraggedItemLevel(null); }}
            >
                <div 
                    className="grid gap-0" 
                    style={{ gridTemplateColumns: `repeat(${currentGridSize}, minmax(0, 1fr))` }}
                >
                    {activeGrid.map((row, y) => (
                        row.map((tile, x) => {
                            // Validation Logic for Drag & Drop Visuals
                            let isValidDrop = undefined;
                            if (tile.locked) {
                                isValidDrop = false;
                            } else if (draggedItemType) {
                                const isMerge = draggedItemType === ItemType.HOUSE && 
                                                tile.type === ItemType.HOUSE && 
                                                draggedItemLevel === tile.level;
                                
                                isValidDrop = tile.type === ItemType.EMPTY || isMerge;
                            }
                            
                            // Tutorial Highlighting for Grid
                            let isTutorialHighlighted = false;
                            if (isTutorialActive) {
                                if (tutorialStep === 'INTRO_SOURCE' && x === 5 && y === 0) isTutorialHighlighted = true;
                                if (tutorialStep === 'PLACE_PIPE' && x === 5 && y === 1) isTutorialHighlighted = true;
                                if (tutorialStep === 'PLACE_HOUSE' && x === 5 && y === 2) isTutorialHighlighted = true;
                                // Can be more dynamic for house, but sticking to linear path for tutorial
                            }

                            return (
                                <div 
                                    key={tile.id} 
                                    className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16"
                                    onDragOver={(e) => handleDragOver(e, x, y)}
                                    onDrop={(e) => handleDrop(e, x, y)}
                                    onDragEnter={(e) => e.preventDefault()}
                                    onDragEnd={handleDragEnd}
                                >
                                    <Tile 
                                        tile={tile}
                                        isSelected={inspectedTile?.x === x && inspectedTile?.y === y && inspectedTile?.board === activeBoard} 
                                        isDragTarget={dragTarget?.x === x && dragTarget?.y === y}
                                        isValidDrop={isValidDrop}
                                        onClick={() => handleTileClick(x, y)}
                                        onContextMenu={(e) => handleContextMenu(e, x, y)}
                                        onDragStart={(e) => handleGridDragStart(e, x, y)}
                                        droplets={activeBoard === BoardType.MAIN ? droplets.filter(d => d.x === x && d.y === y) : undefined}
                                        isTutorialHighlighted={isTutorialHighlighted}
                                    />
                                </div>
                            );
                        })
                    ))}
                </div>
                
                <div className="absolute -top-12 left-0 text-2xl font-bold text-slate-700 uppercase tracking-widest pointer-events-none">
                    {activeBoard === BoardType.MAIN ? 'Distribution Grid' : 'Storage Facility'}
                </div>
            </div>

            {/* Pause Overlay */}
            {isPaused && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-slate-950/60" /> {/* Slightly darker overlay without blur */}
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl flex flex-col items-center gap-2 animate-fade-in relative z-10">
                        <Pause size={32} className="text-yellow-400 mb-1" fill="currentColor" />
                        <span className="text-xl font-bold text-white tracking-widest">SIMULATION PAUSED</span>
                        <span className="text-xs text-slate-400">Build mode active</span>
                    </div>
                </div>
            )}
            
            {/* Tutorial Overlay */}
            {isTutorialActive && (
                 <TutorialOverlay 
                    step={tutorialStep} 
                    onNext={handleNextStep} 
                    onSkip={handleSkipTutorial}
                 />
            )}

            {renderInspectionPanel()}
            {renderTooltip()}

            {toast && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white px-6 py-2 rounded-full shadow-2xl animate-fade-in z-50 flex items-center gap-2">
                    <Info size={16} className="text-blue-400" />
                    {toast.msg}
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default App;
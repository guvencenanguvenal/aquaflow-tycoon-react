import React, { useState, useEffect, useRef } from 'react';
import { ItemType, TileData, Direction, Droplet as DropletType } from '../types';
import { Droplet, Home, ArrowDown, Lock } from 'lucide-react';

interface TileProps {
  tile: TileData;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  isSelected?: boolean;
  isDragTarget?: boolean;
  isValidDrop?: boolean;
  droplets?: DropletType[];
  isTutorialHighlighted?: boolean;
}

const unrotateDirection = (dir: Direction, rotation: number): Direction => {
  const dirs: Direction[] = ['N', 'E', 'S', 'W'];
  const gridIndex = dirs.indexOf(dir);
  const offset = rotation / 90;
  const localIndex = (gridIndex - offset + 4) % 4;
  return dirs[localIndex];
};

const getLocalCoords = (pos: Direction | 'Center') => {
    if (pos === 'N') return { x: 50, y: 0 };
    if (pos === 'S') return { x: 50, y: 100 };
    if (pos === 'E') return { x: 100, y: 50 };
    if (pos === 'W') return { x: 0, y: 50 };
    return { x: 50, y: 50 };
};

const BasePipeShape = ({ type }: { type: ItemType }) => {
  const color = '#334155'; // Slate-700
  const strokeWidth = 26;

  switch (type) {
    case ItemType.PIPE_STRAIGHT:
    case ItemType.SOURCE:
      return (
        <line x1="50" y1="0" x2="50" y2="100" stroke={color} strokeWidth={strokeWidth} />
      );
    case ItemType.HOUSE:
      return (
        <path d="M50,0 L50,100 M0,50 L100,50" fill="none" stroke={color} strokeWidth={strokeWidth} />
      );
    case ItemType.PIPE_ELBOW:
      return (
        <path d="M50,0 L50,50 L100,50" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
      );
    case ItemType.PIPE_TEE:
    case ItemType.PIPE_SPLIT_2:
      return (
        <path d="M50,0 L50,50 L100,50 M50,50 L0,50" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
      );
    case ItemType.PIPE_CROSS:
      return (
        <path d="M50,0 L50,100 M0,50 L100,50" fill="none" stroke={color} strokeWidth={strokeWidth} />
      );
    default:
      return null;
  }
};

const FlowArrow: React.FC<{ start: {x:number, y:number}, end: {x:number, y:number} }> = ({ start, end }) => {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // Calculate angle in degrees
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return (
        <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
            <path 
                d="M-5,-4 L4,0 L-5,4" 
                fill="#ffffff" 
                stroke="#1e3a8a" 
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-flow-arrow drop-shadow-sm" 
            />
        </g>
    );
};

const WaterFlowAnimated = ({ 
    type, 
    rotation, 
    flowIn, 
    flowOut, 
    isWet 
}: { 
    type: ItemType; 
    rotation: number; 
    flowIn: Direction[]; 
    flowOut: Direction[]; 
    isWet: boolean 
}) => {
    if (!isWet) return null;

    const staticColor = '#1e3a8a'; // Dark blue base
    const flowColor = '#60a5fa'; // Light blue flow
    
    // Map grid directions to local rotation-aware directions
    const localIn = flowIn.map(d => unrotateDirection(d, rotation));
    const localOut = flowOut.map(d => unrotateDirection(d, rotation));

    const renderFlowLine = (start: Direction | 'Center', end: Direction | 'Center', isOverlay: boolean) => {
        const startCoords = getLocalCoords(start);
        const endCoords = getLocalCoords(end);

        const props = {
            stroke: isOverlay ? flowColor : staticColor,
            strokeWidth: isOverlay ? 6 : 12,
            strokeLinecap: 'round' as const,
            fill: 'none',
            className: isOverlay ? 'animate-flow' : '',
            strokeDasharray: isOverlay ? '10 10' : 'none',
            opacity: isOverlay ? 0.9 : 0.5,
        };

        return <line x1={startCoords.x} y1={startCoords.y} x2={endCoords.x} y2={endCoords.y} {...props} />;
    };

    return (
        <g>
            {/* Base Layer (Static Water) */}
            {localIn.map((d, i) => <g key={`base-in-${i}`}>{renderFlowLine(d, 'Center', false)}</g>)}
            {localOut.map((d, i) => <g key={`base-out-${i}`}>{renderFlowLine('Center', d, false)}</g>)}
            
            {/* Overlay Layer (Animated Flow) */}
            {localIn.map((d, i) => <g key={`anim-in-${i}`}>{renderFlowLine(d, 'Center', true)}</g>)}
            {localOut.map((d, i) => <g key={`anim-out-${i}`}>{renderFlowLine('Center', d, true)}</g>)}

            {/* Directional Arrows Layer */}
            {localIn.map((d, i) => (
                <FlowArrow key={`arrow-in-${i}`} start={getLocalCoords(d)} end={getLocalCoords('Center')} />
            ))}
            {localOut.map((d, i) => (
                <FlowArrow key={`arrow-out-${i}`} start={getLocalCoords('Center')} end={getLocalCoords(d)} />
            ))}
            
            {/* Center Junction Effect */}
            {(localIn.length > 0 || localOut.length > 0) && (
                 <g>
                    <circle cx="50" cy="50" r={6} fill={staticColor} opacity="0.5" />
                    <circle cx="50" cy="50" r={4} fill={flowColor} opacity="0.8" className="animate-pulse-glow" />
                 </g>
            )}
        </g>
    );
};

// --- Droplet Render Logic ---
const DropletLayer = ({ droplets, rotation }: { droplets: DropletType[], rotation: number }) => {
    if (!droplets || droplets.length === 0) return null;

    return (
        <>
            {droplets.map(d => {
                const localFrom = d.fromDir ? unrotateDirection(d.fromDir, rotation) : null;
                const localTo = d.toDir ? unrotateDirection(d.toDir, rotation) : null;

                let startX = 50, startY = 50;
                let endX = 50, endY = 50;
                let t = 0; 

                // First half: Move from Entry Edge to Center
                if (d.progress < 50) {
                    t = d.progress / 50;
                    if (localFrom === 'N') { startX = 50; startY = 0; }
                    else if (localFrom === 'S') { startX = 50; startY = 100; }
                    else if (localFrom === 'E') { startX = 100; startY = 50; }
                    else if (localFrom === 'W') { startX = 0; startY = 50; }
                    else { startX = 50; startY = 50; } // Spawn at center
                    
                    endX = 50; endY = 50;
                } 
                // Second half: Move from Center to Exit Edge
                else {
                    t = (d.progress - 50) / 50;
                    startX = 50; startY = 50;
                    if (localTo === 'N') { endX = 50; endY = 0; }
                    else if (localTo === 'S') { endX = 50; endY = 100; }
                    else if (localTo === 'E') { endX = 100; endY = 50; }
                    else if (localTo === 'W') { endX = 0; endY = 50; }
                    else { endX = 50; endY = 50; } // Stuck/End
                }

                // Linear Interpolation
                const cx = startX + (endX - startX) * t;
                const cy = startY + (endY - startY) * t;

                return (
                    <circle 
                        key={d.id} 
                        cx={cx} 
                        cy={cy} 
                        r="5" 
                        fill="#60a5fa" 
                        stroke="#eff6ff" 
                        strokeWidth="2" 
                        className="drop-shadow-md"
                    />
                );
            })}
        </>
    );
};

// --- Depot Visualizations ---

const PumpVisual = ({ level }: { level: number }) => (
  <g>
    <rect x="15" y="65" width="70" height="20" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="2" />
    <rect x="30" y="25" width="40" height="40" rx="4" fill="#ca8a04" stroke="#854d0e" strokeWidth="2" />
    <circle cx="50" cy="45" r="12" fill="#facc15" stroke="#854d0e" strokeWidth="2" className="animate-spin origin-center duration-3s" />
    <path d="M50 33 V57 M38 45 H62" stroke="#854d0e" strokeWidth="2" className="animate-spin origin-center duration-3s" />
    
    <rect x="20" y="55" width="10" height="10" fill="#94a3b8" />
    <rect x="70" y="55" width="10" height="10" fill="#94a3b8" />
    
    <rect x="35" y="15" width="30" height="14" rx="4" fill="#0f172a" stroke="#facc15" strokeWidth="1" />
    <text x="50" y="25" textAnchor="middle" fontSize="9" fill="#facc15" fontFamily="monospace" fontWeight="bold">LV{level}</text>
  </g>
);

const WellVisual = ({ level }: { level: number }) => (
  <g>
    <ellipse cx="50" cy="80" rx="35" ry="10" fill="#0f172a" />
    <path d="M35 80 L40 20 L60 20 L65 80" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
    <rect x="30" y="15" width="40" height="8" rx="2" fill="#10b981" stroke="#064e3b" strokeWidth="1" />
    
    <line x1="50" y1="23" x2="50" y2="55" stroke="#d1fae5" strokeWidth="2" strokeDasharray="4 2" />
    
    <rect x="42" y="55" width="16" height="20" rx="2" fill="#34d399" stroke="#065f46" strokeWidth="2" className="animate-bounce duration-2s" />

    <rect x="35" y="85" width="30" height="12" rx="4" fill="#0f172a" stroke="#34d399" strokeWidth="1" />
    <text x="50" y="94" textAnchor="middle" fontSize="9" fill="#34d399" fontFamily="monospace" fontWeight="bold">LV{level}</text>
  </g>
);

const TankVisual = ({ level }: { level: number }) => (
  <g>
     <defs>
        <linearGradient id="tankGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0e7490" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
    </defs>
    <rect x="25" y="10" width="50" height="80" rx="4" fill="url(#tankGrad)" stroke="#155e75" strokeWidth="2" />
    
    {/* Bands */}
    <rect x="24" y="25" width="52" height="6" fill="#164e63" />
    <rect x="24" y="65" width="52" height="6" fill="#164e63" />

    {/* Window */}
    <rect x="45" y="35" width="10" height="25" rx="2" fill="#083344" />
    <rect x="46" y="45" width="8" height="14" rx="1" fill="#67e8f9" className="animate-pulse" />

    <rect x="35" y="80" width="30" height="12" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
    <text x="50" y="89" textAnchor="middle" fontSize="9" fill="#22d3ee" fontFamily="monospace" fontWeight="bold">LV{level}</text>
  </g>
);

const DepotVisuals = ({ type, level }: { type: ItemType, level: number }) => {
    switch (type) {
        case ItemType.DEPOT_PUMP:
            return <PumpVisual level={level} />;
        case ItemType.DEPOT_WELL:
            return <WellVisual level={level} />;
        case ItemType.DEPOT_TANK:
            return <TankVisual level={level} />;
        default:
            return null;
    }
};

// Helper for House Colors
const getHouseStyles = (level: number, isSupplied: boolean) => {
    switch (level) {
        case 1: // Green
            return {
                icon: isSupplied ? 'text-green-400' : 'text-green-700',
                ring: isSupplied ? 'ring-green-500/50' : 'ring-green-900/20',
                bg: isSupplied ? 'bg-green-900/30' : 'bg-green-900/10',
                badge: 'text-green-200 border-green-900/50 bg-green-900/80'
            };
        case 2: // Blue
            return {
                icon: isSupplied ? 'text-blue-400' : 'text-blue-700',
                ring: isSupplied ? 'ring-blue-500/50' : 'ring-blue-900/20',
                bg: isSupplied ? 'bg-blue-900/30' : 'bg-blue-900/10',
                badge: 'text-blue-200 border-blue-900/50 bg-blue-900/80'
            };
        case 3: // Purple
             return {
                icon: isSupplied ? 'text-purple-400' : 'text-purple-700',
                ring: isSupplied ? 'ring-purple-500/50' : 'ring-purple-900/20',
                bg: isSupplied ? 'bg-purple-900/30' : 'bg-purple-900/10',
                badge: 'text-purple-200 border-purple-900/50 bg-purple-900/80'
            };
        case 4: // Amber/Gold
             return {
                icon: isSupplied ? 'text-amber-400' : 'text-amber-700',
                ring: isSupplied ? 'ring-amber-500/50' : 'ring-amber-900/20',
                bg: isSupplied ? 'bg-amber-900/30' : 'bg-amber-900/10',
                badge: 'text-amber-200 border-amber-900/50 bg-amber-900/80'
            };
        default: // Rose (Level 5+)
             return {
                icon: isSupplied ? 'text-rose-400' : 'text-rose-700',
                ring: isSupplied ? 'ring-rose-500/50' : 'ring-rose-900/20',
                bg: isSupplied ? 'bg-rose-900/30' : 'bg-rose-900/10',
                badge: 'text-rose-200 border-rose-900/50 bg-rose-900/80'
            };
    }
}

export const Tile: React.FC<TileProps> = React.memo(({ tile, onClick, onContextMenu, onDragStart, isSelected, isDragTarget, isValidDrop, droplets, isTutorialHighlighted }) => {
  const { type, rotation, level, isWet, isSupplied, flowIn, flowOut, latestInteraction, isPrimary, locked } = tile;
  
  // Track Upgrade State
  const [effectState, setEffectState] = useState<'IDLE' | 'UPGRADING' | 'MERGING'>('IDLE');
  const prevLevel = useRef(level);

  useEffect(() => {
    if (level > prevLevel.current) {
        if (latestInteraction === 'MERGE') {
             setEffectState('MERGING');
        } else {
             setEffectState('UPGRADING');
        }
        const timer = setTimeout(() => setEffectState('IDLE'), 800);
        return () => clearTimeout(timer);
    }
    prevLevel.current = level;
  }, [level, latestInteraction]);

  const style = { transform: `rotate(${rotation}deg)` };

  // Calculate border class based on drag state
  let borderClass = 'border-slate-800 hover:border-slate-500';
  let bgClass = 'bg-slate-900';
  
  if (locked) {
     borderClass = 'border-slate-900/50';
     bgClass = 'bg-slate-950';
  } else if (isTutorialHighlighted) {
      borderClass = 'ring-4 ring-white animate-pulse z-50 border-blue-400';
      bgClass = 'bg-slate-800 shadow-2xl shadow-blue-500/50';
  } else if (isSelected) {
      borderClass = 'ring-2 ring-yellow-400 z-10 border-transparent';
  } else if (isDragTarget) {
      if (isValidDrop === true) {
          borderClass = 'border-2 border-dashed border-green-400';
          bgClass = 'bg-green-900/20';
      } else if (isValidDrop === false) {
          borderClass = 'border-2 border-dashed border-red-400';
          bgClass = 'bg-red-900/20';
      } else {
          borderClass = 'border-2 border-dashed border-slate-400';
      }
  }

  const isDraggable = !locked && type !== ItemType.EMPTY && type !== ItemType.SOURCE;
  const houseStyle = type === ItemType.HOUSE ? getHouseStyles(level, isSupplied) : null;
  
  // Handling Tower Visualization
  const isTower = type === 'TOWER' as ItemType;
  if (isTower && !isPrimary) {
      // Secondary tiles of tower are hidden (but handle drag events)
      return (
        <div 
           draggable={true}
           onDragStart={onDragStart}
           onClick={onClick}
           className="w-full h-full bg-slate-900 border border-slate-800"
        />
      );
  }

  if (locked) {
      return (
        <div 
            onClick={onClick}
            className={`w-full h-full border ${borderClass} ${bgClass} flex items-center justify-center relative overflow-hidden cursor-pointer hover:bg-slate-900 group transition-colors`}
        >
             <div className="absolute inset-0 opacity-10 bg-stripe-pattern"></div>
             <div className="z-10 flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity">
                <Lock size={16} className="text-slate-500 mb-1" />
                <span className="text-[9px] text-slate-500 font-mono font-bold">$1k</span>
             </div>
        </div>
      );
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        relative w-full h-full border transition-all duration-200
        flex items-center justify-center select-none overflow-visible
        ${borderClass} ${bgClass}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${effectState === 'MERGING' ? 'animate-merge-flash z-50' : ''}
        ${isTower ? 'z-30' : ''}
      `}
    >
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
          <div className="w-full h-full border border-slate-700"></div>
      </div>

      <div style={style} className={`w-full h-full flex items-center justify-center relative pointer-events-none ${isTower ? 'overflow-visible' : ''}`}>
        
        {(type.includes('PIPE') || type === ItemType.SOURCE || type === ItemType.HOUSE) && (
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                <BasePipeShape type={type} />
                <WaterFlowAnimated 
                    type={type} 
                    rotation={rotation} 
                    flowIn={flowIn} 
                    flowOut={flowOut} 
                    isWet={isWet} 
                />
                <DropletLayer droplets={droplets || []} rotation={rotation} />
            </svg>
        )}

        {(type === ItemType.DEPOT_PUMP || type === ItemType.DEPOT_WELL || type === ItemType.DEPOT_TANK) && (
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                 <DepotVisuals type={type} level={level} />
            </svg>
        )}

        {isTower && (
             <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-indigo-900/80 border-4 border-indigo-500 rounded-lg flex flex-col items-center justify-center shadow-xl">
                 <Home size={48} className="text-indigo-300 mb-2" />
                 <span className="font-bold text-indigo-100 text-sm">AQUA TOWER</span>
                 <span className="font-mono text-[10px] text-indigo-400">Lv{level}</span>
             </div>
        )}

        {type === ItemType.SOURCE && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/80 p-1 rounded-full border border-blue-500/50">
                    <ArrowDown className="text-blue-400" size={20} />
                </div>
            </div>
        )}

        {type === ItemType.HOUSE && houseStyle && (
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            <div className={`relative z-10 p-2 rounded-full ${houseStyle.bg} ring-2 ${houseStyle.ring} transition-all duration-500`}>
                <Home size={28} className={houseStyle.icon} fill={isSupplied ? 'currentColor' : 'none'} />
                {isSupplied && (
                    <div className="absolute -top-1 -right-1">
                        <Droplet size={14} className="text-blue-400 animate-bounce" fill="currentColor" />
                    </div>
                )}
            </div>
            <div className="absolute -bottom-2 -right-2 z-20">
                 <div className={`text-[10px] px-1.5 py-0.5 rounded border font-mono shadow-md ${houseStyle.badge}`}>
                    Lv{level}
                 </div>
            </div>
          </div>
        )}
      </div>

      {/* Standard Upgrade Effect */}
      {effectState === 'UPGRADING' && (
           <>
               <div className="absolute inset-0 border-4 border-yellow-400 rounded-lg animate-ping opacity-50 z-50 pointer-events-none"></div>
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
                   <span className="text-yellow-300 font-bold text-xs animate-float-up filter drop-shadow-lg shadow-black">LEVEL UP!</span>
               </div>
           </>
       )}

       {/* Merge Effect */}
       {effectState === 'MERGING' && (
           <>
               <div className="absolute inset-0 bg-white/50 rounded-lg z-50 pointer-events-none animate-ping"></div>
               <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
                   <span className="text-cyan-300 font-extrabold text-sm animate-float-up filter drop-shadow-[0_0_8px_rgba(34,211,238,1)] stroke-black">MERGED!</span>
               </div>
           </>
       )}
    </div>
  );
});

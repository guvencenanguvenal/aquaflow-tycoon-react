import React from 'react';
import { ArrowLeft, Droplet, Home, Activity, DollarSign } from 'lucide-react';

interface HowToPlayScreenProps {
  onBack: () => void;
}

export const HowToPlayScreen: React.FC<HowToPlayScreenProps> = ({ onBack }) => {
  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden animate-fade-in">
      <div className="container mx-auto max-w-4xl h-full flex flex-col p-6 md:p-12">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
           <button 
             onClick={onBack}
             className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
           >
              <div className="p-2 bg-slate-900 rounded-full group-hover:bg-slate-800 border border-slate-800">
                <ArrowLeft size={20} />
              </div>
              <span className="font-bold text-lg">Back to Menu</span>
           </button>
           <h1 className="text-3xl font-bold text-white">How to Play</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-12 pb-12">
            
            {/* Section 1: Basics */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-3">
                    <div className="p-2 bg-blue-900/30 rounded-lg">
                        <Droplet size={24} />
                    </div>
                    Water Flow Basics
                </h2>
                <p className="text-slate-300 leading-relaxed text-lg">
                    The goal is to transport water from the <strong>Source</strong> to <strong>Houses</strong>. 
                    Water flows automatically through connected pipes. 
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <h3 className="text-white font-bold mb-2">1. The Source</h3>
                        <p className="text-sm text-slate-400">Located at the top center. Water originates here.</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <h3 className="text-white font-bold mb-2">2. Pipelines</h3>
                        <p className="text-sm text-slate-400">Connect straight, elbow, and splitter pipes to guide the flow.</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <h3 className="text-white font-bold mb-2">3. Houses</h3>
                        <p className="text-sm text-slate-400">Delivering water to houses generates revenue.</p>
                    </div>
                </div>
            </section>

            {/* Section 2: Economy */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-green-400 flex items-center gap-3">
                    <div className="p-2 bg-green-900/30 rounded-lg">
                        <DollarSign size={24} />
                    </div>
                    Economy & Upgrades
                </h2>
                <p className="text-slate-300 leading-relaxed text-lg">
                    Every water droplet that passes through a house earns you cash. Use this money to expand your grid and upgrade infrastructure.
                </p>
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 space-y-2">
                        <h3 className="text-yellow-400 font-bold text-xl">Merge to Upgrade</h3>
                        <p className="text-slate-400">
                            Place a building on top of an identical one to <strong>Merge</strong> them. 
                            Merged buildings (Level 2+) generate significantly more income and process water faster.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-16 h-16 bg-slate-800 rounded flex items-center justify-center border-2 border-slate-600">Lv1</div>
                        <span className="text-slate-500 self-center">+</span>
                        <div className="w-16 h-16 bg-slate-800 rounded flex items-center justify-center border-2 border-slate-600">Lv1</div>
                        <span className="text-white self-center">=</span>
                        <div className="w-16 h-16 bg-blue-900/40 rounded flex items-center justify-center border-2 border-yellow-400 text-yellow-400 font-bold">Lv2</div>
                    </div>
                </div>
            </section>

             {/* Section 3: Depot */}
             <section className="space-y-4">
                <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-3">
                    <div className="p-2 bg-indigo-900/30 rounded-lg">
                        <Activity size={24} />
                    </div>
                    Water Depot
                </h2>
                <p className="text-slate-300 leading-relaxed text-lg">
                    Your <strong>Water Depot</strong> manages the global supply. If you run out of water, flow stops!
                </p>
                <ul className="grid grid-cols-1 gap-3">
                    <li className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-slate-300"><strong>Deep Well:</strong> Refills the water tank over time.</span>
                    </li>
                    <li className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span className="text-slate-300"><strong>Storage Tank:</strong> Increases maximum water capacity.</span>
                    </li>
                    <li className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        <span className="text-slate-300"><strong>Water Pump:</strong> Increases droplet spawn speed.</span>
                    </li>
                </ul>
            </section>
        </div>

      </div>
    </div>
  );
};
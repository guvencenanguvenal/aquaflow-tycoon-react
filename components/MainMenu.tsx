import React from 'react';
import { Droplet, Play, BookOpen, LogOut } from 'lucide-react';

interface MainMenuProps {
  onPlay: () => void;
  onHowToPlay: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onPlay, onHowToPlay }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
       <div className="text-center space-y-8 animate-fade-in p-8 w-full max-w-2xl">
          <div className="flex flex-col items-center gap-6">
             <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/20 border-t border-blue-400/30">
                    <Droplet size={80} className="text-white drop-shadow-md" fill="currentColor" />
                </div>
             </div>
             
             <div className="space-y-2">
                <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-200 tracking-tight drop-shadow-sm">
                    AquaFlow
                </h1>
                <h2 className="text-3xl font-bold text-blue-500 tracking-widest uppercase">Tycoon</h2>
             </div>
             
             <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                Construct intricate pipelines, manage water resources, and build a thriving city in this strategic engineering simulation.
             </p>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-sm mx-auto mt-8">
             <button
                onClick={onPlay}
                className="group relative w-full py-5 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl transition-all transform hover:scale-105 hover:shadow-blue-500/40 overflow-hidden border border-blue-500/50"
             >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer skew-x-12"></div>
                <div className="flex items-center justify-center gap-4 relative z-10">
                   <div className="bg-white/20 p-1.5 rounded-full">
                        <Play size={24} fill="currentColor" className="ml-0.5" />
                   </div>
                   <span className="text-xl tracking-wide">New Game</span>
                </div>
             </button>

             <button
                onClick={onHowToPlay}
                className="w-full py-5 px-8 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-4 border border-slate-700 hover:border-slate-600 backdrop-blur-sm"
             >
                <div className="bg-slate-700/50 p-1.5 rounded-full">
                    <BookOpen size={24} />
                </div>
                <span className="text-xl tracking-wide">How to Play</span>
             </button>

             <button
                onClick={() => {}} 
                className="w-full py-5 px-8 bg-slate-900/50 hover:bg-red-900/20 text-slate-400 hover:text-red-400 font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-4 border border-slate-800 hover:border-red-900/30 backdrop-blur-sm group"
             >
                <div className="bg-slate-800/50 p-1.5 rounded-full group-hover:bg-red-900/30 transition-colors">
                    <LogOut size={24} />
                </div>
                <span className="text-xl tracking-wide">Exit</span>
             </button>
          </div>
          
          <div className="text-slate-600 text-xs font-mono mt-12 pt-8 border-t border-slate-800/50">
             v1.2.0 • AquaFlow Tycoon • React
          </div>
       </div>
    </div>
  );
};
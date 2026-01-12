import React from 'react';
import { X, ArrowRight, Check, Play } from 'lucide-react';

export type TutorialStep = 
  | 'WELCOME'
  | 'INTRO_SOURCE'
  | 'SELECT_PIPE'
  | 'PLACE_PIPE'
  | 'SELECT_HOUSE'
  | 'PLACE_HOUSE'
  | 'EXPLAIN_INCOME'
  | 'COMPLETE';

interface TutorialOverlayProps {
  step: TutorialStep;
  onNext: () => void;
  onSkip: () => void;
  targetRect?: DOMRect | null; // For precise positioning if needed
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip }) => {
  if (step === 'WELCOME') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-900 border border-blue-500/30 p-8 rounded-2xl shadow-2xl max-w-md text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
          
          <div className="bg-blue-900/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/50">
             <Play size={32} className="text-blue-400 ml-1" fill="currentColor" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Welcome to AquaFlow!</h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Master the flow of water to build a thriving city. This quick tutorial will guide you through the basics of pipeline construction and economy.
          </p>
          
          <div className="flex gap-4 justify-center">
             <button 
                onClick={onSkip}
                className="px-4 py-2 text-slate-400 hover:text-white font-medium text-sm transition-colors"
             >
                Skip
             </button>
             <button 
                onClick={onNext}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 flex items-center gap-2"
             >
                Start Tutorial <ArrowRight size={16} />
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'COMPLETE') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
         <div className="bg-slate-900 border border-green-500/30 p-8 rounded-2xl shadow-2xl max-w-md text-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500"></div>
          
          <div className="bg-green-900/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/50">
             <Check size={32} className="text-green-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Tutorial Complete!</h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            You've got the basics down. Water flows from the source, through pipes, into houses to generate money. 
            <br/><br/>
            <span className="text-yellow-200 text-sm">Tip: Don't forget to visit the Water Depot to upgrade your storage and pumps!</span>
          </p>
          
          <button 
            onClick={onSkip} // Acts as close
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-900/20 transition-all transform hover:scale-105"
          >
            Let's Play
          </button>
        </div>
      </div>
    );
  }

  // Floating Steps (rendered as non-modal overlays or effectively managed via props in parent)
  // For the specific steps, we render a generic "Help Card" at the bottom center or relevant position
  // The highlighting is handled by the main app components
  
  let message = "";
  let title = "";

  switch (step) {
      case 'INTRO_SOURCE':
          title = "The Source";
          message = "This is your Water Source. All water flows from here. It needs a pipeline to reach the city.";
          break;
      case 'SELECT_PIPE':
          title = "Draft a Pipe";
          message = "Select a pipe from your drafting toolbar on the left. Look for the highlighted slot.";
          break;
      case 'PLACE_PIPE':
          title = "Connect the Flow";
          message = "Place the pipe directly below the Water Source to start your network.";
          break;
      case 'SELECT_HOUSE':
          title = "Draft a House";
          message = "Now, select a House from the toolbar. Houses pay for water delivery.";
          break;
      case 'PLACE_HOUSE':
          title = "Supply the House";
          message = "Place the house connected to your new pipe. Ensure the arrows align so water flows in.";
          break;
      case 'EXPLAIN_INCOME':
          title = "Making Money";
          message = "Watch the droplets! When they pass through a house, you earn money. Use money to expand and upgrade.";
          break;
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-none">
        <div className="bg-slate-800/90 backdrop-blur border border-blue-500/50 p-6 rounded-xl shadow-2xl flex items-start gap-4 pointer-events-auto animate-fade-in">
            <div className="flex-1">
                <h3 className="text-blue-300 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">TIP</span>
                    {title}
                </h3>
                <p className="text-white text-lg leading-snug">{message}</p>
            </div>
            {(step === 'INTRO_SOURCE' || step === 'EXPLAIN_INCOME') && (
                <button 
                    onClick={onNext}
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
                >
                    <ArrowRight size={20} />
                </button>
            )}
            <button 
                onClick={onSkip}
                className="text-slate-500 hover:text-slate-300 p-1"
                title="End Tutorial"
            >
                <X size={16} />
            </button>
        </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { MousePointer2, Info, X, Activity, PlayCircle, ZoomIn, ZoomOut, Smartphone, Monitor } from 'lucide-react';
import { INFO_CONTENT } from '../constants';

interface UIOverlayProps {
  activeFeature: string | null;
  onClose: () => void;
  onZoom: (direction: 'in' | 'out') => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ activeFeature, onClose, onZoom }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (showIntro) {
      return (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
              <div className="max-w-2xl w-full bg-slate-900 border border-teal-500/30 rounded-3xl p-10 shadow-[0_0_50px_rgba(20,184,166,0.2)] text-center animate-in zoom-in-95 duration-500">
                  <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-teal-900/50 flex items-center justify-center border-2 border-teal-500 animate-pulse">
                        <Activity className="text-teal-400 w-10 h-10" />
                    </div>
                  </div>
                  <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
                    Meet the <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Plasma Cell</span>
                  </h1>
                  <h2 className="text-xl text-teal-200/80 font-medium mb-8">The Immune System's Heavy Artillery</h2>
                  
                  <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
                    You are about to explore a specialized biological factory. Unlike regular cells, this machine has evolved for one purpose: speed. 
                    <br/><br/>
                    <span className="text-teal-400 font-semibold">It produces thousands of antibodies per second</span> to hunt down invaders.
                  </p>

                  <button 
                    onClick={() => setShowIntro(false)}
                    className="group bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white text-lg font-bold px-10 py-4 rounded-full shadow-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] transition-all duration-300 flex items-center gap-3 mx-auto"
                  >
                    <PlayCircle className="group-hover:scale-110 transition-transform" />
                    Start Exploration
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col p-6">
      
      {/* Top Header */}
      <div className="pointer-events-auto flex justify-between items-start mb-auto">
         <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl font-light text-white tracking-wider drop-shadow-md">
            PLASMA<span className="font-bold text-teal-400">CELL</span>
            </h1>
            <p className="text-teal-200/70 text-sm mt-1">Interactive 3D Atlas</p>
         </div>
         
         <div className={`transition-opacity duration-300 ${activeFeature ? 'opacity-100' : 'opacity-0'}`}>
             <button 
                onClick={onClose}
                className="bg-slate-900/80 border border-slate-600 text-white px-4 py-2 rounded-full text-sm hover:bg-slate-800 transition-colors pointer-events-auto shadow-lg"
             >
                Reset View
             </button>
         </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
         <div className="pointer-events-auto fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-teal-500/30 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               {/* Modal Header */}
               <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <Activity className="text-teal-400" />
                    <h2 className="text-2xl font-bold text-white">Cellular Guide</h2>
                  </div>
                  <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
               </div>
               
               {/* Modal Content */}
               <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                  {/* General Intro */}
                  <div className="bg-teal-900/20 border border-teal-500/20 rounded-xl p-6">
                     <h3 className="text-xl font-bold text-teal-300 mb-2">{INFO_CONTENT["Cell"].title}</h3>
                     <p className="text-slate-300 leading-relaxed mb-4">{INFO_CONTENT["Cell"].description}</p>
                     <p className="text-teal-100 font-medium italic">Function: {INFO_CONTENT["Cell"].function}</p>
                  </div>

                  {/* Organelle Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {Object.entries(INFO_CONTENT).map(([key, data]) => {
                        if (key === "Cell") return null;
                        return (
                           <div key={key} className="bg-slate-800/50 p-5 rounded-lg border border-slate-700 hover:border-teal-500/50 transition-colors">
                              <h4 className="text-lg font-bold text-teal-200 mb-2">{data.title}</h4>
                              <p className="text-sm text-slate-400 mb-3 leading-relaxed">{data.description}</p>
                              <div className="text-xs font-semibold text-teal-500 uppercase tracking-wide">
                                Role: <span className="text-slate-300 normal-case">{data.function}</span>
                              </div>
                           </div>
                        )
                     })}
                  </div>
               </div>
            </div>
         </div>
       )}

      {/* Bottom Bar */}
      <div className="w-full flex justify-between items-end relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
         {/* Left: Info Button */}
         <div className="pointer-events-auto">
            <button
                onClick={() => setShowInfo(true)}
                className="group flex items-center gap-3 bg-slate-900/90 hover:bg-teal-600 border border-teal-500/50 hover:border-teal-400 text-teal-50 px-5 py-3 rounded-full shadow-[0_0_20px_rgba(15,23,42,0.6)] transition-all duration-300 backdrop-blur-md"
            >
                <Info size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-semibold tracking-wide hidden sm:inline">Cell Guide</span>
            </button>
         </div>

         {/* Center: Hint */}
         <div className={`pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 transition-all duration-500 ${activeFeature || showInfo ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-200 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-pulse">
                <MousePointer2 size={18} className="text-teal-400" />
                <span className="text-sm font-medium tracking-wide">Click organelles to identify</span>
            </div>
         </div>

         {/* Right: Zoom Controls */}
         <div className="pointer-events-auto flex flex-col items-end gap-3">
            {/* Zoom Buttons */}
            <div className="flex gap-2">
               <button
                  onClick={() => onZoom('in')}
                  className="bg-slate-900/90 hover:bg-teal-600 border border-teal-500/50 hover:border-teal-400 text-teal-50 p-3 rounded-full shadow-lg transition-all duration-300 backdrop-blur-md"
                  aria-label="Zoom in"
               >
                  <ZoomIn size={20} />
               </button>
               <button
                  onClick={() => onZoom('out')}
                  className="bg-slate-900/90 hover:bg-teal-600 border border-teal-500/50 hover:border-teal-400 text-teal-50 p-3 rounded-full shadow-lg transition-all duration-300 backdrop-blur-md"
                  aria-label="Zoom out"
               >
                  <ZoomOut size={20} />
               </button>
            </div>

            {/* Zoom Instructions */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-300 px-4 py-2 rounded-lg text-xs flex items-center gap-2">
               {isMobile ? (
                  <>
                     <Smartphone size={14} className="text-teal-400" />
                     <span>Pinch to zoom • Drag to rotate</span>
                  </>
               ) : (
                  <>
                     <Monitor size={14} className="text-teal-400" />
                     <span>Scroll to zoom • Drag to rotate</span>
                  </>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;
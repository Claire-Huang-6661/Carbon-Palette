import React, { useMemo } from 'react';
import { X, ArrowRight, Zap, Info, Sparkles } from 'lucide-react';
import { Ingredient, PlateItem, CategoryType } from '../types';
import { INGREDIENTS } from '../data';

interface MagicSwapProps {
  plateItems: PlateItem[];
  onReplace: (oldInstanceId: string, newIngredient: Ingredient) => void;
  onClose: () => void;
}

const MagicSwap: React.FC<MagicSwapProps> = ({ plateItems, onReplace, onClose }) => {
  const recommendations = useMemo(() => {
    const candidates = plateItems
      .filter(item => item.ghgFactor > 1.0)
      .sort((a, b) => b.ghgFactor - a.ghgFactor);

    if (candidates.length === 0) return [];

    return candidates.slice(0, 3).map(target => {
      const alternatives = INGREDIENTS.filter(ing => {
        if (target.category === CategoryType.MEAT) {
          return ing.category === CategoryType.GRAIN || ing.category === CategoryType.FISH || ing.category === CategoryType.FRUIT_VEG;
        }
        return ing.ghgFactor < target.ghgFactor * 0.6;
      }).sort((a, b) => a.ghgFactor - b.ghgFactor);

      const replacement = alternatives[0] || INGREDIENTS.find(i => i.name === 'Potato');
      const savings = (target.price * target.ghgFactor) - (replacement!.price * replacement!.ghgFactor);

      return { target, replacement: replacement!, savings };
    });
  }, [plateItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xl p-6">
      <div className="bg-white w-full max-w-2xl rounded-[64px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300">
        <div className="p-12 pb-8 flex justify-between items-start bg-[#D9FF00]/5 border-b border-[#D9FF00]/10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-900 text-[#D9FF00] rounded-[32px] shadow-2xl flex items-center justify-center transform -rotate-6">
              <Sparkles size={36} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Magic Optimizer</h2>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">AI Sustainability Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm hover:rotate-90 transition-all border border-slate-100">
            <X size={24} className="text-slate-900" />
          </button>
        </div>

        <div className="p-12 space-y-8">
          {recommendations.length > 0 ? (
            recommendations.map((rec, idx) => (
              <div key={idx} className="relative group">
                <div className="flex items-center gap-8 p-8 bg-slate-50 rounded-[48px] border border-slate-100 group-hover:bg-white group-hover:shadow-2xl group-hover:border-transparent transition-all">
                  <div className="flex-1">
                    <div className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                       High Impact
                    </div>
                    <div className="text-2xl font-black text-slate-900">{rec.target.icon} {rec.target.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Category: {rec.target.category}</div>
                  </div>
                  
                  <div className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-100">
                    <ArrowRight className="text-slate-300 group-hover:text-slate-900 transition-colors" size={24} />
                  </div>

                  <div className="flex-1">
                    <div className="text-[11px] font-black text-[#D9FF00] bg-slate-900 px-3 py-1 rounded-full w-fit uppercase tracking-widest mb-2">
                       Optimizer Choice
                    </div>
                    <div className="text-2xl font-black text-slate-900">{rec.replacement.icon} {rec.replacement.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Savings: {rec.savings.toFixed(2)} kg</div>
                  </div>

                  <button 
                    onClick={() => onReplace(rec.target.instanceId, rec.replacement)}
                    className="ml-4 bg-[#D9FF00] hover:bg-black hover:text-[#D9FF00] text-slate-900 font-black py-5 px-10 rounded-[28px] transition-all shadow-xl active:scale-95 text-sm uppercase tracking-widest"
                  >
                    SWAP
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-[48px] border-4 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                 <Zap className="text-[#D9FF00]" fill="currentColor" size={32} />
              </div>
              <p className="text-slate-400 font-black text-lg uppercase tracking-widest">Tray already optimized</p>
              <p className="text-slate-400 text-sm mt-2">Your current selection has minimal carbon impact.</p>
            </div>
          )}
        </div>

        <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Sustainable Dining Framework v2024
          </p>
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-slate-200"></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicSwap;

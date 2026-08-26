import React from 'react';
import { INGREDIENTS } from '../data';
import { Ingredient } from '../types';
import { Leaf } from 'lucide-react';

const IngredientLibrary: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, ingredient: Ingredient) => {
    e.dataTransfer.setData('ingredient', JSON.stringify(ingredient));
    e.dataTransfer.effectAllowed = 'copy';
    
    const ghost = document.createElement('div');
    ghost.style.fontSize = '48px';
    ghost.innerHTML = ingredient.icon;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 24, 24);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  return (
    <div className="w-full h-full bg-[#0D1117] flex flex-col p-4 sm:p-6">
      {/* Mini Header */}
      <div className="mb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-white/20 text-[8px] font-black uppercase tracking-[0.4em]">SPECTRAL FOOD LIBRARY</h3>
          <div className="px-2 py-0.5 bg-white/5 rounded-full border border-white/10 text-[7px] font-bold text-white/15 uppercase tracking-widest">
            Drag to Plate
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-1 h-1 w-24 rounded-full overflow-hidden bg-white/5">
            <div className="flex-[3] bg-emerald-500/30"></div>
            <div className="flex-[4] bg-orange-500/30"></div>
            <div className="flex-[3] bg-red-500/30"></div>
          </div>
        </div>
      </div>
      
      {/* Compressed Pantry Section */}
      <div className="flex-1 flex items-center gap-3 overflow-x-auto pb-1 scroll-hide">
        {INGREDIENTS.map((ingredient) => {
          const isHighImpact = ingredient.ghgFactor > 1.5;
          const isLowImpact = ingredient.ghgFactor < 0.2;
          const impactColorClass = isHighImpact ? 'text-red-400' : isLowImpact ? 'text-emerald-400' : 'text-[#D9FF00]';
          
          return (
            <div
              key={ingredient.id}
              draggable
              onDragStart={(e) => handleDragStart(e, ingredient)}
              className="flex-shrink-0 group cursor-grab active:cursor-grabbing h-full"
            >
              <div 
                className="w-32 h-full min-h-[120px] rounded-[24px] bg-[#161B22]/90 border border-white/5 flex flex-col items-center justify-between p-3 transition-all hover:bg-[#1C2128] hover:border-white/10 hover:-translate-y-1"
              >
                {/* Compact GHG Badge */}
                <div className="w-full flex justify-end">
                   <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded-full border border-white/5">
                     <Leaf size={7} className={impactColorClass} fill="currentColor" />
                     <span className="text-[7px] font-black text-white/50">{ingredient.ghgFactor.toFixed(2)}</span>
                   </div>
                </div>

                {/* Smaller Icon */}
                <div className="text-3xl mb-1 group-hover:scale-110 duration-300 filter drop-shadow-lg">
                  {ingredient.icon}
                </div>
                
                {/* Info Text */}
                <div className="w-full text-center mb-1">
                  <div className="text-white text-[9px] font-black uppercase tracking-tight truncate">
                    {ingredient.name}
                  </div>
                  <div className="text-white/15 text-[7px] font-bold uppercase truncate">
                    {ingredient.unit}
                  </div>
                </div>

                {/* Price Label */}
                <div className="w-full py-1.5 bg-black/50 rounded-lg flex items-center justify-center border border-white/5">
                  <span className="text-white font-black text-[9px]">£{ingredient.price.toFixed(1)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IngredientLibrary;
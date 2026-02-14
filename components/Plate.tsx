import React, { useRef, useState, useEffect } from 'react';
import { Ingredient, PlateItem } from '../types';
import { X, Plus, Minus, Leaf } from 'lucide-react';

interface PlateProps {
  items: PlateItem[];
  onDrop: (ingredient: Ingredient, x: number, y: number) => void;
  onRemove: (instanceId: string) => void;
  onUpdateQuantity: (instanceId: string, newQty: number) => void;
  onUpdatePosition: (instanceId: string, x: number, y: number) => void;
}

const Plate: React.FC<PlateProps> = ({ items, onDrop, onRemove, onUpdateQuantity, onUpdatePosition }) => {
  const plateRef = useRef<HTMLDivElement>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playDropSound = (ghgFactor: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Pitch Logic: Lower GHG -> Higher, Crispier "Tink". Higher GHG -> Lower, Dull "Clunk"
      const baseFreq = 1800;
      // Range: ~400Hz (beef) to ~1750Hz (orange)
      const freq = Math.max(300, baseFreq - (ghgFactor * 600)); 
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.1, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio blocked");
    }
  };

  const triggerPlateShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('ingredient');
    if (!data || !plateRef.current) return;

    const ingredient: Ingredient = JSON.parse(data);
    const rect = plateRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onDrop(ingredient, x, y);
    playDropSound(ingredient.ghgFactor);
    triggerPlateShake();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedItemId || !plateRef.current) return;
      const rect = plateRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onUpdatePosition(draggedItemId, Math.max(8, Math.min(92, x)), Math.max(8, Math.min(92, y)));
    };
    const handleMouseUp = () => setDraggedItemId(null);
    if (draggedItemId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedItemId, onUpdatePosition]);

  return (
    <div 
      ref={plateRef}
      onDragOver={handleDragOver}
      onDrop={handleDropInternal}
      className={`relative w-[540px] h-[540px] sm:w-[680px] sm:h-[680px] rounded-full plate-realistic flex items-center justify-center border-[28px] border-white ring-[12px] ring-black/5 ${isShaking ? 'animate-plate-impact' : ''}`}
    >
      {items.length === 0 && (
        <div className="text-slate-300 flex flex-col items-center gap-4 animate-in fade-in duration-700 pointer-events-none">
          <div className="w-24 h-24 rounded-full border-2 border-slate-100 flex items-center justify-center bg-white shadow-sm">
            <span className="text-4xl filter grayscale opacity-20">🍽️</span>
          </div>
          <p className="font-extrabold uppercase tracking-[0.4em] text-[10px] opacity-30">Place Ingredients</p>
        </div>
      )}

      {/* Item Rendering - Absolute positioning relative to plate center */}
      {items.map((item) => {
        const isDragging = draggedItemId === item.instanceId;
        const impact = (item.ghgFactor * item.price * item.quantity).toFixed(3);
        const isHighImpact = item.ghgFactor > 1.5;

        return (
          <div
            key={item.instanceId}
            style={{ 
              left: `${item.x}%`, 
              top: `${item.y}%`, 
              transform: 'translate(-50%, -50%)', 
              zIndex: isDragging ? 1000 : 20,
              willChange: isDragging ? 'left, top' : 'auto'
            }}
            className={`absolute group touch-none cursor-grab active:cursor-grabbing transition-transform duration-150 ease-out`}
            onMouseDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button')) return;
              setDraggedItemId(item.instanceId);
            }}
          >
            <div className="flex flex-col items-center">
              {/* Ingredient Card */}
              <div className={`w-24 h-24 sm:w-28 sm:h-28 bg-white/95 backdrop-blur-sm rounded-[32px] shadow-xl border-2 border-white flex flex-col items-center justify-center relative transition-transform ${isDragging ? 'scale-110 shadow-2xl' : 'hover:scale-105'}`}>
                <div className="text-5xl mb-1 select-none pointer-events-none drop-shadow-md">{item.icon}</div>
                <div className="text-[10px] font-black text-slate-800 uppercase tracking-tighter text-center px-2 pointer-events-none leading-none">{item.name}</div>
                <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onRemove(item.instanceId); }} className="absolute -top-2 -right-2 bg-[#E65F5F] text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center border-2 border-white active:scale-95 z-[110] transition-all opacity-0 group-hover:opacity-100"><X size={14} strokeWidth={4} /></button>
              </div>

              {/* Pill Controls - Hidden by default, shown on hover */}
              <div className="mt-4 flex flex-col items-center gap-1.5 w-max pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out">
                <div className="bg-[#12141D] rounded-full px-5 py-3 shadow-2xl flex flex-col items-center border border-white/5 ring-4 ring-black/5">
                  <div className="flex items-center gap-3 mb-1.5">
                     <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.instanceId, item.quantity - 0.5); }} className="text-white/30 hover:text-[#D9FF00] p-1 transition-colors"><Minus size={12} strokeWidth={4} /></button>
                     <div className="flex items-center gap-2 text-white font-bold text-[11px] min-w-[90px] justify-center">
                        <span className="text-[#D9FF00]">£{(item.price * item.quantity).toFixed(2)}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                        <span className="text-white/50">{(item.weightGrams * item.quantity).toFixed(0)}g</span>
                     </div>
                     <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.instanceId, item.quantity + 0.5); }} className="text-white/30 hover:text-[#D9FF00] p-1 transition-colors"><Plus size={12} strokeWidth={4} /></button>
                  </div>
                  <div className={`flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest ${isHighImpact ? 'text-[#FF6B6B]' : 'text-[#4ade80]'}`}>
                    <Leaf size={10} fill="currentColor" />
                    IMPACT: {impact} KG
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Plate;
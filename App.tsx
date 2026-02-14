import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Sparkles, Activity, FileText, RotateCcw, Wallet, Leaf, Info, X, Bell, ChevronRight, User, Utensils } from 'lucide-react';
import { INGREDIENTS } from './data';
import { Ingredient, PlateItem } from './types';
import Plate from './components/Plate';
import IngredientLibrary from './components/IngredientLibrary';
import MagicSwap from './components/MagicSwap';
import NutritionRadar from './components/NutritionRadar';
import CarbonBill from './components/CarbonBill';

const App: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [mealType, setMealType] = useState('Lunch');
  const [isStarted, setIsStarted] = useState(false);
  
  const [plateItems, setPlateItems] = useState<PlateItem[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<'magic' | 'radar' | 'bill' | 'carbon-breakdown' | 'spending-breakdown' | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'enter' | 'print' | 'reset') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    if (type === 'enter') {
      // Short, crisp "Pop-Chime" sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1); // E6
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.15);
    } else if (type === 'print') {
      for (let i = 0; i < 15; i++) {
        const time = now + i * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100 + Math.random() * 30, time);
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } else if (type === 'reset') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    }
  };

  const handleStart = () => {
    playSound('enter');
    setIsStarted(true);
  };

  const handleFullReset = () => {
    setPlateItems([]);
    setIsStarted(false);
    setActiveOverlay(null);
  };

  const stats = useMemo(() => {
    return plateItems.reduce(
      (acc, item) => ({
        totalPrice: acc.totalPrice + (item.price * item.quantity),
        totalCarbon: acc.totalCarbon + (item.price * item.quantity * item.ghgFactor),
      }),
      { totalPrice: 0, totalCarbon: 0 }
    );
  }, [plateItems]);

  const handleDrop = useCallback((ingredient: Ingredient, x: number, y: number) => {
    const newItem: PlateItem = {
      ...ingredient,
      instanceId: Math.random().toString(36).substr(2, 9),
      x,
      y,
      quantity: 1,
    };
    setPlateItems(prev => [...prev, newItem]);
  }, []);

  const updateQuantity = useCallback((instanceId: string, newQty: number) => {
    setPlateItems(prev => prev.map(item => 
      item.instanceId === instanceId ? { ...item, quantity: Math.max(0.1, Math.min(10, newQty)) } : item
    ));
  }, []);

  const updatePosition = useCallback((instanceId: string, x: number, y: number) => {
    setPlateItems(prev => prev.map(item => 
      item.instanceId === instanceId ? { ...item, x, y } : item
    ));
  }, []);

  const removeItem = useCallback((instanceId: string) => {
    setPlateItems(prev => prev.filter(item => item.instanceId !== instanceId));
  }, []);

  const resetPlate = () => {
    playSound('reset');
    setPlateItems([]);
  };

  const handleMagicReplace = (oldInstanceId: string, newIngredient: Ingredient) => {
    setPlateItems(prev => 
      prev.map(item => 
        item.instanceId === oldInstanceId 
          ? { ...newIngredient, instanceId: oldInstanceId, x: item.x, y: item.y, quantity: item.quantity }
          : item
      )
    );
    setActiveOverlay(null);
  };

  const carbonPercentage = Math.min(100, (stats.totalCarbon / 15) * 100);

  if (!isStarted) {
    return (
      <div className="w-full h-screen bg-[#B5BAA1] flex items-center justify-center p-6">
        <div className="bg-white/95 backdrop-blur-3xl w-full max-w-xl rounded-[64px] shadow-2xl p-12 sm:p-16 border border-white/40">
           <div className="flex flex-col items-center text-center mb-12">
              <div className="w-24 h-24 bg-slate-900 text-[#D9FF00] rounded-[32px] flex items-center justify-center mb-8 shadow-2xl rotate-6">
                 <Utensils size={44} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Chef Selection</h1>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest px-8 leading-relaxed">
                Welcome to Carbon Palette. Set your identity and meal type to begin.
              </p>
           </div>

           <div className="space-y-10">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-4">Designer Name</label>
                 <input 
                   type="text" 
                   value={userName}
                   onChange={(e) => setUserName(e.target.value)}
                   placeholder="Enter your name..."
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] px-8 py-5 font-black text-slate-900 outline-none focus:border-[#D9FF00] transition-all"
                 />
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-4">Meal Occasion</label>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setMealType(type)}
                        className={`py-4 rounded-[24px] font-black text-xs uppercase tracking-widest border-2 transition-all ${mealType === type ? 'bg-slate-900 border-slate-900 text-[#D9FF00] shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                      >
                        {type}
                      </button>
                    ))}
                 </div>
              </div>

              <button 
                onClick={handleStart}
                disabled={!userName.trim()}
                className="w-full bg-[#D9FF00] hover:bg-black hover:text-[#D9FF00] text-slate-900 font-black py-7 rounded-[32px] text-lg uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-4"
              >
                Enter Kitchen
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-[#B5BAA1]">
      
      {/* Dashboard Layer */}
      <div className={`flex-[4] flex flex-col overflow-hidden px-6 py-6 sm:px-10 sm:py-10 relative transition-all duration-700 ${activeOverlay ? 'blur-2xl scale-[0.98]' : ''}`}>
        
        {/* Top Control Bar */}
        <div className="z-[60] flex justify-between items-start w-full gap-4 shrink-0 pointer-events-none">
          <div className="bg-[#D9FF00] p-6 rounded-[48px] shadow-2xl flex flex-col gap-4 min-w-[320px] max-w-sm pointer-events-auto ml-[-20px] sm:ml-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                   <User size={20} className="text-slate-900" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-lg leading-none truncate max-w-[160px]">{userName}</h2>
                  <span className="text-[10px] font-bold text-slate-800 opacity-50 uppercase tracking-widest mt-1 block">{mealType} Session</span>
                </div>
              </div>
              <div className="flex gap-2">
                 <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"><Bell size={18} className="text-slate-800" /></button>
                 <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"><Info size={18} className="text-slate-800" /></button>
              </div>
            </div>
            <div className="bg-white/30 backdrop-blur-sm p-4 rounded-[32px] border border-white/20">
              <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden mt-2 mb-2">
                <div className="h-full bg-slate-900 transition-all duration-1000 ease-out" style={{ width: `${carbonPercentage}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-900 uppercase tracking-widest">
                <span>Meal Progress</span>
                <span>{Math.round(carbonPercentage)}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 items-end pointer-events-auto mr-[-20px] sm:mr-0">
            <button onClick={() => setActiveOverlay('magic')} className="bg-white/90 backdrop-blur-xl hover:bg-[#D9FF00] p-5 rounded-[36px] shadow-xl transition-all group border border-white/60 flex items-center gap-5 hover:-translate-x-4">
              <div className="w-12 h-12 bg-slate-900 text-[#D9FF00] rounded-[20px] flex items-center justify-center group-hover:bg-black transition-colors"><Sparkles size={24} fill="currentColor" /></div>
              <div className="text-left pr-6">
                <span className="block font-black text-slate-900 text-base leading-tight">Magic Optimizer</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">AI Sustainable Swap</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900" />
            </button>
            <button onClick={() => setActiveOverlay('radar')} className="bg-white/90 backdrop-blur-xl hover:bg-slate-900 hover:text-[#D9FF00] p-5 rounded-[36px] shadow-xl transition-all group border border-white/60 flex items-center gap-5 hover:-translate-x-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center group-hover:bg-[#D9FF00] group-hover:text-slate-900 transition-colors"><Activity size={24} /></div>
              <div className="text-left pr-6">
                <span className="block font-black text-slate-900 group-hover:text-white text-base leading-tight">Balance Radar</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">Realtime Nutrients</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 w-full flex items-center justify-center relative min-h-0 z-10">
          <div className="relative transform scale-[0.7] sm:scale-100 mb-20">
            <Plate 
              items={plateItems} 
              onDrop={handleDrop} 
              onRemove={removeItem}
              onUpdateQuantity={updateQuantity}
              onUpdatePosition={updatePosition}
            />
            {plateItems.length > 0 && (
              <button onClick={resetPlate} className="absolute -right-40 top-1/2 -translate-y-1/2 p-6 bg-white shadow-2xl rounded-full text-slate-200 hover:text-red-500 border-[6px] border-white/50 z-[100] transition-all active:scale-90"><RotateCcw size={32} strokeWidth={3} /></button>
            )}
          </div>
        </div>

        <div className="z-[60] flex items-end justify-between w-full mx-auto mb-2 gap-6 shrink-0 relative px-2 pointer-events-none">
          <div 
            onClick={() => setActiveOverlay('spending-breakdown')} 
            className="bg-white/95 p-6 rounded-[44px] shadow-2xl border border-white/60 flex items-center gap-8 min-w-[320px] cursor-pointer hover:bg-white transition-all hover:-translate-y-2 group active:scale-95 pointer-events-auto ml-[-20px] sm:ml-0"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-[28px] flex items-center justify-center group-hover:bg-[#D9FF00] transition-colors">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-[#D9FF00]"><Wallet size={20} /></div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Transaction</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-slate-400">£</span>
                <span className="text-5xl font-black text-slate-900 leading-none">{stats.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mb-2 pointer-events-auto">
            <button 
              disabled={plateItems.length === 0}
              onClick={(e) => { e.stopPropagation(); setActiveOverlay('bill'); }}
              className={`group flex items-center gap-8 px-16 py-8 rounded-[48px] font-black text-2xl shadow-2xl transition-all active:scale-95 border-8 ${plateItems.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-white' : 'bg-slate-900 text-white hover:bg-black hover:-translate-y-2 border-slate-800'}`}
            >
              <div className="w-11 h-11 bg-[#D9FF00] rounded-full flex items-center justify-center text-slate-900 transition-transform group-hover:rotate-12"><FileText size={24} /></div>
              PRINT STATEMENT
            </button>
          </div>

          <div 
            onClick={() => setActiveOverlay('carbon-breakdown')} 
            className="bg-slate-900 p-6 rounded-[44px] shadow-2xl border border-white/10 flex items-center gap-8 min-w-[320px] cursor-pointer hover:bg-black transition-all hover:-translate-y-2 text-right active:scale-95 pointer-events-auto mr-[-20px] sm:mr-0"
          >
            <div className="flex-1">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Total Footprint</span>
              <div className="flex items-baseline justify-end gap-2">
                <span className={`text-5xl font-black leading-none ${stats.totalCarbon > 25 ? 'text-red-500' : 'text-[#D9FF00]'}`}>{stats.totalCarbon.toFixed(2)}</span>
                <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">kg</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/5 rounded-[28px] flex items-center justify-center">
              <div className="w-10 h-10 bg-[#D9FF00] rounded-full flex items-center justify-center text-white"><Leaf size={22} fill="currentColor" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient Library */}
      <div className={`flex-1 min-h-[180px] max-h-[220px] z-[70] bg-[#0D1117] shrink-0 border-t border-white/10 transition-all duration-700 ${activeOverlay ? 'blur-2xl' : ''}`}>
        <IngredientLibrary />
      </div>

      {activeOverlay === 'magic' && <MagicSwap plateItems={plateItems} onReplace={handleMagicReplace} onClose={() => setActiveOverlay(null)} />}
      {activeOverlay === 'radar' && <NutritionRadar items={plateItems} onClose={() => setActiveOverlay(null)} onOpenBill={() => setActiveOverlay('bill')} />}
      {activeOverlay === 'bill' && <CarbonBill items={plateItems} stats={stats} onClose={() => setActiveOverlay(null)} onFullReset={handleFullReset} userName={userName} mealType={mealType} />}
      
      {/* Breakdowns */}
      {(activeOverlay === 'carbon-breakdown' || activeOverlay === 'spending-breakdown') && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-3xl p-6" onClick={() => setActiveOverlay(null)}>
          <div className="bg-white w-full max-w-lg rounded-[60px] overflow-hidden shadow-2xl p-12 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-3xl font-black text-slate-900">
                    {activeOverlay === 'carbon-breakdown' ? 'Carbon Ledger' : 'Spending Ledger'}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Itemized Calculation View</p>
               </div>
               <button onClick={() => setActiveOverlay(null)} className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all">
                 <X size={24} className="text-slate-900" />
               </button>
             </div>
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 scroll-hide">
               {plateItems.map(item => (
                 <div key={item.instanceId} className="flex justify-between items-center p-6 bg-slate-50 rounded-[32px] border border-slate-100 transition-all hover:bg-white group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-3xl group-hover:scale-110 transition-transform">{item.icon}</div>
                      <div>
                        <span className="block font-black text-slate-900 text-lg">{item.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">x{item.quantity.toFixed(1)} {item.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="font-black text-slate-900 text-xl block">
                        {activeOverlay === 'carbon-breakdown' ? `${(item.price * item.quantity * item.ghgFactor).toFixed(3)} kg` : `£${(item.price * item.quantity).toFixed(2)}`}
                       </span>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

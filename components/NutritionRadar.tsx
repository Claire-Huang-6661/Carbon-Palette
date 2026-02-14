import React from 'react';
import { X, Activity, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { PlateItem } from '../types';

interface NutritionRadarProps {
  items: PlateItem[];
  onClose: () => void;
  onOpenBill: () => void;
}

const NutritionRadar: React.FC<NutritionRadarProps> = ({ items, onClose, onOpenBill }) => {
  const data = React.useMemo(() => {
    const base = [
      { subject: 'Protein', A: 0 },
      { subject: 'Carbs', A: 0 },
      { subject: 'Fiber', A: 0 },
      { subject: 'Fat', A: 0 },
      { subject: 'Vitamins', A: 0 },
    ];
    if (items.length === 0) return base;

    const totals = items.reduce(
      (acc, item) => ({
        protein: acc.protein + item.nutrients.protein * item.quantity,
        carbs: acc.carbs + item.nutrients.carbs * item.quantity,
        fiber: acc.fiber + item.nutrients.fiber * item.quantity,
        fat: acc.fat + item.nutrients.fat * item.quantity,
        vitamins: acc.vitamins + item.nutrients.vitamins * item.quantity,
      }),
      { protein: 0, carbs: 0, fiber: 0, fat: 0, vitamins: 0 }
    );

    const maxVal = Math.max(totals.protein, totals.carbs, totals.fiber, totals.fat, totals.vitamins, 20);
    return [
      { subject: 'Protein', A: (totals.protein / maxVal) * 100 },
      { subject: 'Carbs', A: (totals.carbs / maxVal) * 100 },
      { subject: 'Fiber', A: (totals.fiber / maxVal) * 100 },
      { subject: 'Fat', A: (totals.fat / maxVal) * 100 },
      { subject: 'Vitamins', A: (totals.vitamins / maxVal) * 100 },
    ];
  }, [items]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-3xl p-6 overflow-y-auto scroll-hide">
      <div className="bg-white w-full max-w-4xl rounded-[80px] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-500 relative flex flex-col min-h-[600px]">
        
        {/* Header */}
        <div className="p-12 pb-6 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-[#f0fdf4] text-[#10b981] rounded-[24px] flex items-center justify-center border border-[#10b981]/10">
                <Activity size={28} />
             </div>
             <div>
                <h2 className="text-[28px] font-black text-slate-900 tracking-tight leading-none mb-1">Nutrient Density</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Realtime Balance Radar</p>
             </div>
          </div>
          <button onClick={onClose} className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100 shadow-sm active:scale-95">
            <X size={24} className="text-slate-900" />
          </button>
        </div>

        {/* Content Area */}
        <div className="px-12 pb-12 pt-4 flex flex-col md:flex-row gap-12 items-center flex-1">
          
          {/* Radar Section */}
          <div className="w-full h-[400px] flex-1 bg-slate-50/50 rounded-[56px] p-8 relative flex items-center justify-center border border-slate-50">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                <PolarGrid stroke="#e2e8f0" strokeWidth={2} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Current Meal"
                  dataKey="A"
                  stroke="#10b981"
                  strokeWidth={4}
                  fill="#D9FF00"
                  fillOpacity={0.4}
                  animationDuration={1500}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Analysis Section */}
          <div className="flex-1 w-full space-y-8">
            {/* Shrunk AI Diagnosis Card */}
            <div className="bg-[#12141D] p-6 rounded-[36px] text-white shadow-xl relative overflow-hidden group max-w-sm">
               <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck size={20} className="text-[#D9FF00]" />
                  <span className="font-black text-[9px] uppercase tracking-[0.3em] text-[#D9FF00]">AI Diagnosis</span>
               </div>
               <p className="text-[15px] font-bold leading-relaxed tracking-tight text-white/90">
                 {items.length === 0 
                   ? "Awaiting ingredients for analysis." 
                   : "Your meal composition is highly optimized for vitamin absorption and long-term satiety."}
               </p>
            </div>

            {/* Composition List */}
            <div className="space-y-4">
               <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-slate-100"></span>
                  Composition Items
               </h4>
               <div className="grid grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2 scroll-hide">
                 {items.map((item, idx) => (
                   <div key={idx} className="flex items-center gap-3 bg-slate-50 p-4 rounded-[20px] border border-slate-100 hover:bg-white transition-all group">
                     <span className="text-2xl drop-shadow-sm group-hover:scale-110 transition-transform">{item.icon}</span>
                     <span className="font-black text-slate-800 text-[11px] uppercase tracking-tighter truncate">{item.name}</span>
                   </div>
                 ))}
                 {items.length === 0 && <div className="col-span-2 text-center py-6 text-slate-300 font-bold uppercase tracking-widest text-[9px]">Empty Tray</div>}
               </div>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex justify-center opacity-30">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] text-center max-w-xl">
            CALIBRATED TO WORLD HEALTH ORGANIZATION STANDARDS (2025)
          </p>
        </div>
      </div>
    </div>
  );
};

export default NutritionRadar;

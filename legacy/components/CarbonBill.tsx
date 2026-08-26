
import React, { useState, useEffect, useRef } from 'react';
import { X, Share2, Leaf, Smartphone, Car, Plane, User, Printer, Download, Zap, AlertTriangle, Quote, Utensils, ArrowLeft } from 'lucide-react';
import { PlateItem } from '../types';
import html2canvas from 'https://esm.sh/html2canvas';

interface CarbonBillProps {
  items: PlateItem[];
  stats: { totalPrice: number; totalCarbon: number };
  onClose: () => void;
  onFullReset: () => void;
  userName: string;
  mealType: string;
}

const CarbonBill: React.FC<CarbonBillProps> = ({ items, stats, onClose, onFullReset, userName, mealType }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);
  const [currentDate] = useState(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
  const receiptId = useRef(`CP-${Math.floor(100000 + Math.random() * 900000)}`);
  const receiptRef = useRef<HTMLDivElement>(null);
  const statementCardRef = useRef<HTMLDivElement>(null);

  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const getSeverity = (total: number) => {
    if (total < 5.0) return { 
      label: 'SUSTAINABLE SELECTION', 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50', 
      impactColor: 'text-emerald-600',
      description: `Equivalent to ${(total * 122).toFixed(0)} phone charges. This choice is well within sustainable daily limits.`
    };
    if (total < 25.0) return { 
      label: 'MODERATE FOOTPRINT', 
      color: 'text-orange-500', 
      bg: 'bg-orange-50', 
      impactColor: 'text-slate-900',
      description: `Equivalent to ${(total * 4.2).toFixed(1)}km of driving. Your meal has a noticeable but manageable footprint.`
    };
    return { 
      label: 'CRITICAL FOOTPRINT ALERT', 
      color: 'text-[#E65F5F]', 
      bg: 'bg-[#FFF5F5]', 
      impactColor: 'text-[#E65F5F]',
      description: `Equivalent to ${(total * 5.8).toFixed(1)}km of flight travel. Your meal's footprint is extremely high.`
    };
  };

  const severity = getSeverity(stats.totalCarbon);

  const handlePrint = () => {
    setIsPrinting(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2.5;
      setPrintProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsPrinting(false);
          setShowReceipt(true);
        }, 500);
      }
    }, 40);
  };

  const handleDownloadStatement = async () => {
    if (statementCardRef.current) {
      try {
        const canvas = await html2canvas(statementCardRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
          borderRadius: 64,
        });
        const link = document.createElement('a');
        link.download = `MealStatement-${userName || 'Guest'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Failed to capture statement image:", err);
      }
    }
  };

  const handleSaveSlip = async () => {
    if (receiptRef.current) {
      try {
        const canvas = await html2canvas(receiptRef.current, {
          backgroundColor: '#000000',
          scale: 3,
          useCORS: true,
          logging: false,
        });
        const link = document.createElement('a');
        link.download = `CarbonAudit-${receiptId.current}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Failed to capture receipt image:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 sm:p-6 overflow-hidden">
      {!showReceipt ? (
        <div ref={statementCardRef} className="bg-white w-full max-w-lg h-[92vh] max-h-[850px] rounded-[64px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 relative border border-white/20">
          
          <div className="flex-1 overflow-hidden flex flex-col p-6 sm:p-10 pb-0">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-4 shrink-0 px-2 no-print">
              <button onClick={onClose} className="w-11 h-11 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 active:scale-90 group" title="Return to plate">
                <ArrowLeft size={22} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <div className="w-16 h-16 bg-[#12141D] rounded-[24px] flex items-center justify-center shadow-2xl">
                <div className="w-11 h-11 bg-[#D9FF00] rounded-full flex items-center justify-center text-[#12141D]">
                   <Leaf size={24} fill="currentColor" />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleDownloadStatement} className="w-11 h-11 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 active:scale-90" title="Download Statement">
                  <Download size={22} />
                </button>
              </div>
            </div>

            {/* User Pill */}
            <div className="flex justify-center mb-4 shrink-0">
              <div className="inline-flex items-center gap-2 px-6 py-1.5 bg-slate-50/80 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100/50">
                <User size={12} className="opacity-40" />
                <span>{userName || 'GUEST'} • {mealType}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-[32px] font-black text-slate-900 tracking-tighter uppercase text-center mb-5 shrink-0">Meal Statement</h1>

            {/* Severity Warning Alert */}
            <div className={`mx-auto w-full py-4 px-8 rounded-full flex items-center justify-center gap-3 font-black text-[10px] mb-6 ${severity.bg} ${severity.color} tracking-[0.15em] border border-current/5 uppercase shrink-0`}>
              <AlertTriangle size={18} fill="currentColor" className="opacity-70" />
              {severity.label}
            </div>

            {/* Expanded Ingredient Ledger Area */}
            <div className="flex flex-col flex-[1.5] min-h-0 mb-4 px-2 overflow-hidden">
              <div className="flex justify-between text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] pb-3 mb-2 shrink-0 border-b border-slate-50">
                <span>Ingredient Ledger</span>
                <span>Impact (kg)</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 scroll-hide space-y-6 py-4">
                {items.map((item) => (
                  <div key={item.instanceId} className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-[20px] flex items-center justify-center text-3xl shadow-sm border border-slate-100/40">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-[15px] leading-tight mb-0.5">{item.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          £{item.price.toFixed(2)} • {item.unit}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-slate-900 text-[17px] tracking-tight">
                      {(item.ghgFactor * item.price * item.quantity).toFixed(3)}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <Utensils size={48} className="text-slate-200 mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Ingredients Audited</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New Comparison Analogy Box - Text + Icon (Color Bar Removed) */}
          <div className="px-10 shrink-0 mb-4">
            <div className="bg-slate-50/80 rounded-[32px] p-5 border border-slate-200/50 flex items-start gap-4 relative overflow-hidden group">
              {/* Vertical side bar removed as requested */}
              <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 shrink-0">
                {stats.totalCarbon > 25 ? <Plane size={20} className="text-slate-400" /> : stats.totalCarbon > 5 ? <Car size={20} className="text-slate-400" /> : <Smartphone size={20} className="text-slate-400" />}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold leading-relaxed text-slate-500 italic tracking-tight pr-4">
                  "{severity.description}"
                </p>
              </div>
            </div>
          </div>

          {/* Floating Action Pill Area */}
          <div className="px-10 pb-10 shrink-0 no-print">
            <div className="bg-[#D9FF00] rounded-[48px] p-6 sm:p-7 flex items-center justify-between shadow-[0_20px_40px_rgba(0,0,0,0.15)] relative border border-white/40">
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800/40 block mb-1">Total Impact</span>
                <div className="flex items-baseline gap-4">
                  <div className={`text-[64px] font-black leading-none tracking-tighter ${severity.impactColor}`}>
                    {stats.totalCarbon.toFixed(2)}
                  </div>
                  {/* Fused Price Value */}
                  <div className="flex flex-col justify-end pb-1.5">
                    <span className="text-[22px] font-black text-slate-900/60 leading-none tracking-tight">£{stats.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-slate-800/30 uppercase tracking-[0.3em] mt-2 block">KG CO2E EQUIVALENTS</span>
              </div>

              {/* Action Button */}
              <button 
                onClick={handlePrint}
                className="w-16 h-16 bg-[#12141D] rounded-full flex items-center justify-center text-[#D9FF00] shadow-2xl hover:scale-105 active:scale-95 transition-all group shrink-0"
              >
                <Printer size={30} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Printing Overlay */}
          {isPrinting && (
            <div className="absolute inset-0 z-[110] bg-[#12141D] text-white flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
               <div className="mb-10 relative flex items-center justify-center w-32 h-32">
                  <div className="w-24 h-24 border-4 border-[#D9FF00]/10 rounded-full flex items-center justify-center">
                     <Printer size={40} className="text-[#D9FF00] animate-pulse" />
                  </div>
                  <svg className="absolute inset-0 w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                     <circle cx="64" cy="64" r={RADIUS} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#D9FF00]" strokeLinecap="round" style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE - (CIRCUMFERENCE * printProgress) / 100 }} />
                  </svg>
               </div>
               <h3 className="text-2xl font-black mb-2 tracking-tight">Finalizing Audit...</h3>
               <div className="w-full max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D9FF00] transition-all duration-100 ease-linear" style={{ width: `${printProgress}%` }}></div>
               </div>
            </div>
          )}
        </div>
      ) : (
        /* RECEIPT SLIP VIEW */
        <div className="relative animate-in slide-in-from-top-full duration-1000 ease-out flex flex-col items-center max-h-screen scale-[0.88] sm:scale-100">
          <div ref={receiptRef} className="flex flex-col items-center">
            <div className="w-[360px] h-5 flex overflow-hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="flex-1 h-full bg-slate-50" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
              ))}
            </div>

            <div className="w-[360px] bg-slate-50 p-8 flex flex-col items-center relative border-x border-slate-200">
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]"></div>

              <div className="text-center w-full border-b border-slate-900/10 pb-8 mb-8">
                <div className="flex justify-center mb-5">
                  <div className="bg-black text-white p-4 rounded-[18px] shadow-xl">
                    <Zap size={28} fill="currentColor" />
                  </div>
                </div>
                <h2 className="text-[24px] font-black tracking-tighter text-[#1e293b] leading-none mb-2 uppercase text-center">CARBON PALETTE</h2>
                <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.25em] text-center">Audit Verification</p>
              </div>

              <div className="w-full space-y-2 mb-10 text-[#64748b] font-mono text-[11px] leading-tight uppercase">
                <div className="flex justify-between"><span>TIMESTAMP :</span><span className="text-slate-900 font-bold">{currentDate}</span></div>
                <div className="flex justify-between"><span>DESIGNER  :</span><span className="text-slate-900 font-bold">{userName || 'GUEST'}</span></div>
                <div className="flex justify-between"><span>AUDIT REF :</span><span className="text-slate-900 font-bold">{receiptId.current}</span></div>
              </div>

              <div className="w-full space-y-6 mb-12">
                {items.map((item) => (
                  <div key={item.instanceId} className="flex justify-between items-center text-slate-800">
                    <div className="flex items-center gap-4">
                      <span className="text-[24px]">{item.icon}</span>
                      <div className="flex flex-col text-left">
                        <span className="font-black text-[13px] text-slate-900 uppercase leading-none mb-0.5">{item.name}</span>
                        <span className="text-[9px] font-bold text-[#94a3b8]">£{item.price.toFixed(1)}</span>
                      </div>
                    </div>
                    <span className="font-black text-[16px] text-slate-900">{(item.ghgFactor * item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="w-full bg-[#f1f5f9]/80 p-6 rounded-[28px] mb-12 border border-slate-200">
                 <div className="flex justify-between items-center text-[#94a3b8] mb-2 text-left">
                    <span className="font-black text-[9px] uppercase tracking-widest">Net Value</span>
                    <span className="font-black text-[14px]">£{stats.totalPrice.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-3 border-t border-slate-200/50">
                    <span className="font-black text-[13px] uppercase text-slate-900">Total Footprint</span>
                    <div className="text-right">
                      <span className="font-black text-[28px] block leading-none text-slate-900 tracking-tighter">{stats.totalCarbon.toFixed(2)}</span>
                      <span className="text-[9px] font-black text-[#94a3b8] uppercase tracking-widest mt-1">KG CO2e</span>
                    </div>
                 </div>
              </div>

              <div className="w-full h-12 bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_2px,#f8fafc_2px,#f8fafc_6px)] opacity-90 mb-4 rounded-sm"></div>
              <div className="text-[10px] font-black text-[#cbd5e1] tracking-[0.5em] uppercase">AUDIT#{receiptId.current}</div>
            </div>

            <div className="w-[360px] h-5 flex overflow-hidden -mt-1">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="flex-1 h-full bg-slate-50" style={{ clipPath: 'polygon(50% 0, 0 100%, 100% 100%)' }}></div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex gap-5 no-print items-center pb-10">
            <button onClick={handleSaveSlip} className="flex items-center gap-3 bg-white text-slate-900 px-10 py-5 rounded-[32px] font-black text-[13px] uppercase tracking-[0.15em] shadow-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <Download size={20} /> SAVE AUDIT
            </button>
            <button onClick={() => setShowReceipt(false)} className="bg-white text-slate-900 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:bg-slate-50 transition-colors active:scale-90 border border-slate-100">
              <ArrowLeft size={28} />
            </button>
            <button onClick={onFullReset} className="bg-[#12141D] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:bg-black transition-colors active:scale-90">
              <X size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarbonBill;

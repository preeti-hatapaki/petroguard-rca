import React, { useState } from 'react';
import { useRCAStore } from '../store';
import { geminiService } from '../services/gemini';
import { Flame, ShieldAlert, Settings, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const IncidentInput = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setIncident, setNodes } = useRCAStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const initialCauses = await geminiService.generateInitialCauses(input);
      setIncident(input);
      setNodes(initialCauses);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-mono uppercase tracking-widest mb-6">
          <Settings className="w-3 h-3" /> Asset Management & Safety Analysis
        </div>
        <h1 className="text-6xl font-bold tracking-tighter mb-4 leading-none">
          ROOT CAUSE <br /> <span className="italic text-slate-400">ANALYSIS</span>
        </h1>
        <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
          PetroGuard RCA leverages API and CCPS standards to identify systemic failures in refining and petrochemical operations.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the failure event or safety incident in detail..."
            className="w-full h-48 bg-white border-2 border-slate-900 p-6 text-lg focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all resize-none"
            required
          />
          <div className="absolute bottom-4 right-4 flex gap-4">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <Flame className="w-3 h-3" /> Fire/Explosion
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <ShieldAlert className="w-3 h-3" /> Process Safety
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 text-white py-6 text-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              INITIALIZING ANALYSIS...
            </>
          ) : (
            <>
              START RCA INVESTIGATION
              <ArrowRight className="w-6 h-6" />
            </>
          )}
        </button>
      </form>

      <div className="mt-12 grid grid-cols-3 gap-8 border-t border-slate-300 pt-8">
        <div>
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Standards</div>
          <div className="text-xs font-mono">API RP 754 / CCPS RBPS</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Methodology</div>
          <div className="text-xs font-mono">TapRooT / 5-Why / Fishbone</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Compliance</div>
          <div className="text-xs font-mono">OSHA 1910.119 (PSM)</div>
        </div>
      </div>
    </div>
  );
};

export default IncidentInput;

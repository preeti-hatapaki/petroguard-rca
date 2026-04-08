import React from 'react';
import { useRCAStore } from '../store';
import { Calendar, User, CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const ActionTracker = () => {
  const { actions } = useRCAStore();

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-end mb-12 border-b border-slate-900 pb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase">Action Plan</h1>
          <p className="text-slate-500 text-sm mt-2">Corrective and Preventive Actions (CAPA) tracking for identified root causes.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total Actions</div>
          <div className="text-3xl font-mono">{actions.length}</div>
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-dashed border-slate-300 rounded-xl">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-400">No actions recorded yet.</h3>
          <p className="text-sm text-slate-400">Complete RCA and accept root causes to generate actions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest">
            <div className="col-span-4">Action Description</div>
            <div className="col-span-3">Root Cause Link</div>
            <div className="col-span-2">Action Party</div>
            <div className="col-span-2">Timeline</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          {actions.map((action) => (
            <div 
              key={action.id} 
              className="grid grid-cols-12 gap-4 bg-white border border-slate-200 p-6 rounded-lg hover:border-slate-900 transition-all group"
            >
              <div className="col-span-4">
                <div className="font-bold text-sm mb-1">{action.action}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{action.description}</div>
              </div>
              
              <div className="col-span-3 flex items-start gap-2">
                <div className="w-1 h-full bg-red-600 rounded-full" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-red-600 mb-1">Root Cause</div>
                  <div className="text-xs font-medium">{action.rootCauseLabel}</div>
                </div>
              </div>

              <div className="col-span-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  <User className="w-3 h-3" />
                  <input 
                    type="text" 
                    placeholder="Assign Party..." 
                    className="bg-transparent focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  <Clock className="w-3 h-3" />
                  <input 
                    type="date" 
                    className="bg-transparent focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="col-span-1 flex justify-end items-center">
                <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[9px] font-bold uppercase rounded">
                  Pending
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionTracker;

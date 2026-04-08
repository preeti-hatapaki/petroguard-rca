import React, { useState } from 'react';
import { useRCAStore } from './store';
import IncidentInput from './components/IncidentInput';
import RCATree from './components/RCATree';
import ActionTracker from './components/ActionTracker';
import SavedRCAModal from './components/SavedRCAModal';
import { LayoutGrid, ClipboardList, RefreshCcw, ShieldCheck, FileText, FileSpreadsheet, Save, FolderOpen } from 'lucide-react';
import { cn } from './lib/utils';
import { reportService } from './services/reportService';

export default function App() {
  const { incident, nodes, actions, reset } = useRCAStore();
  const [currentView, setCurrentView] = useState<'rca' | 'actions'>('rca');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);

  const handleGenerateWordReport = async () => {
    setIsGeneratingReport(true);
    try {
      await reportService.generateWordReport(incident, nodes, actions);
    } catch (error) {
      console.error("Failed to generate Word report:", error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateExcelReport = () => {
    try {
      reportService.generateExcelReport(nodes, actions);
    } catch (error) {
      console.error("Failed to generate Excel report:", error);
    }
  };

  if (!incident) {
    return (
      <div className="min-h-screen bg-[#E4E3E0]">
        <IncidentInput />
        <SavedRCAModal isOpen={isSavedModalOpen} onClose={() => setIsSavedModalOpen(false)} />
        <button
          onClick={() => setIsSavedModalOpen(true)}
          className="fixed top-8 right-8 bg-white border-2 border-slate-900 px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 shadow-xl z-50"
        >
          <FolderOpen className="w-4 h-4" /> Saved Investigations
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#E4E3E0]">
      {/* Navigation Header */}
      <header className="h-16 bg-white border-b border-slate-900 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 flex items-center justify-center text-white font-bold rounded">P</div>
            <span className="font-bold tracking-tighter text-lg">PETROGUARD <span className="text-slate-400 italic">RCA</span></span>
          </div>
          
          <div className="h-6 w-px bg-slate-200" />
          
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-50 max-w-md truncate">
            <span className="text-slate-400">Incident:</span>
            <span className="text-slate-900 font-bold">{incident}</span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('rca')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all",
              currentView === 'rca' ? "bg-slate-900 text-white" : "hover:bg-slate-100"
            )}
          >
            <LayoutGrid className="w-4 h-4" /> RCA TREE
          </button>
          <button
            onClick={() => setCurrentView('actions')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all",
              currentView === 'actions' ? "bg-slate-900 text-white" : "hover:bg-slate-100"
            )}
          >
            <ClipboardList className="w-4 h-4" /> ACTION PLAN
          </button>
          
          <div className="h-6 w-px bg-slate-200 mx-2" />

          <button
            onClick={handleGenerateWordReport}
            disabled={isGeneratingReport}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all disabled:opacity-50"
            title="Generate Word Report"
          >
            <FileText className="w-4 h-4" /> {isGeneratingReport ? 'GENERATING...' : 'REPORT'}
          </button>

          <button
            onClick={handleGenerateExcelReport}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all"
            title="Download Excel Tree"
          >
            <FileSpreadsheet className="w-4 h-4" /> EXCEL
          </button>

          <div className="h-6 w-px bg-slate-200 mx-2" />

          <button
            onClick={() => setIsSavedModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all"
            title="Save or Load Investigations"
          >
            <Save className="w-4 h-4" /> SAVE/LOAD
          </button>

          <div className="h-6 w-px bg-slate-200 mx-2" />

          {currentView === 'rca' && (
            <button
              id="complete-rca-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('complete-rca'))}
              className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" /> COMPLETE RCA
            </button>
          )}
          
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
          >
            <RefreshCcw className="w-4 h-4" /> RESET
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow overflow-hidden relative">
        {currentView === 'rca' ? (
          <RCATree />
        ) : (
          <div className="h-full overflow-y-auto">
            <ActionTracker />
          </div>
        )}

        <SavedRCAModal isOpen={isSavedModalOpen} onClose={() => setIsSavedModalOpen(false)} />

        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4 z-50">
          <div className="bg-white/80 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-600">CCPS/API Compliant Analysis</span>
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-red-600" />
            <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-600">Root Cause Nodes Highlighted</span>
          </div>
        </div>
      </main>
    </div>
  );
}

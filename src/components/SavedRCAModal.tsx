import React, { useState } from 'react';
import { useRCAStore, SavedRCA } from '../store';
import { X, Trash2, FolderOpen, Save, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SavedRCAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SavedRCAModal({ isOpen, onClose }: SavedRCAModalProps) {
  const { savedRCAs, loadRCA, deleteRCA, saveCurrentRCA, incident, currentRCAId } = useRCAStore();
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = () => {
    if (!saveName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a name for the RCA.' });
      return;
    }

    const result = saveCurrentRCA(saveName.trim());
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setIsSaving(false);
      setSaveName('');
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleLoad = (id: string) => {
    loadRCA(id);
    onClose();
  };

  const currentRCA = currentRCAId ? savedRCAs.find(r => r.id === currentRCAId) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white border-4 border-slate-900 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">PetroGuard RCA</h3>
                <h2 className="text-xl font-black uppercase">Saved Investigations</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow space-y-8">
              {/* Save Current Section */}
              {incident && (
                <section className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300">
                  <h4 className="text-[10px] font-black uppercase mb-4 text-slate-500 tracking-widest">Save Current Investigation</h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder={currentRCA ? `Updating: ${currentRCA.name}` : "Enter a name to save..."}
                      className="flex-grow px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-slate-900 outline-none text-sm font-bold"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                    />
                    <button
                      onClick={handleSave}
                      className="bg-slate-900 text-white px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> {currentRCA ? 'Update' : 'Save'}
                    </button>
                  </div>
                  {message && (
                    <p className={cn(
                      "mt-3 text-[10px] font-bold uppercase",
                      message.type === 'success' ? "text-green-600" : "text-red-600"
                    )}>
                      {message.text}
                    </p>
                  )}
                </section>
              )}

              {/* List Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Stored RCAs ({savedRCAs.length}/10)
                  </h4>
                </div>

                {savedRCAs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {savedRCAs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((rca) => (
                      <div
                        key={rca.id}
                        className={cn(
                          "group p-4 border-2 rounded-xl transition-all flex justify-between items-center",
                          currentRCAId === rca.id ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-300"
                        )}
                      >
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black uppercase tracking-tight">{rca.name}</span>
                            {currentRCAId === rca.id && (
                              <span className="text-[8px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase">Currently Editing</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 italic mb-2">"{rca.incident}"</p>
                          <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(rca.timestamp).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(rca.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{rca.nodes.length} Nodes</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleLoad(rca.id)}
                            className="p-3 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-900 hover:text-white transition-all group/btn"
                            title="Load RCA"
                          >
                            <FolderOpen className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this saved RCA?')) {
                                deleteRCA(rca.id);
                              }
                            }}
                            className="p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                            title="Delete RCA"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No saved investigations found</p>
                  </div>
                )}
              </section>
            </div>

            <div className="p-6 bg-slate-50 border-t-2 border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Note: Data is saved locally in your browser. Clearing browser data will remove these saves.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

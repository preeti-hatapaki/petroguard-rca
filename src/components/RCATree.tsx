import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Connection, 
  Edge, 
  Node, 
  addEdge, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useRCAStore } from '../store';
import CustomNode from './CustomNode';
import { geminiService, CauseNode } from '../services/gemini';
import { AlertTriangle, Plus, Trash2, GitMerge, Check, ArrowRight, X, Search, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const nodeTypes = {
  cause: CustomNode,
};

const RCATree = () => {
  const { incident, nodes, updateNode, addNodes, mergeNodes, addAction } = useRCAStore();
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<{ action: string; description: string }[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLabel, setManualLabel] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Sync store nodes to ReactFlow nodes (Left-to-Right)
  useEffect(() => {
    // ... same logic ...
    const rootMap: Record<string, string> = {};
    const rootNodes = nodes.filter(n => !n.parentId || !nodes.some(p => p.id === n.parentId));
    const getRootId = (nodeId: string): string => {
      if (rootMap[nodeId]) return rootMap[nodeId];
      const node = nodes.find(n => n.id === nodeId);
      if (!node || !node.parentId || !nodes.some(p => p.id === node.parentId)) {
        rootMap[nodeId] = nodeId;
        return nodeId;
      }
      const rootId = getRootId(node.parentId);
      rootMap[nodeId] = rootId;
      return rootId;
    };
    nodes.forEach(n => getRootId(n.id));

    const rfNodes: Node[] = nodes.map((node) => {
      const rootId = rootMap[node.id];
      const rootIndex = rootNodes.findIndex(rn => rn.id === rootId);
      return {
        id: node.id,
        type: 'cause',
        data: { ...node, branchIndex: rootIndex >= 0 ? rootIndex : 0 },
        position: { 
          x: (node.layer - 1) * 450, 
          y: nodes.filter(n => n.layer === node.layer).indexOf(node) * 250 
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const rfEdges: Edge[] = nodes
      .filter(node => node.parentId)
      .map(node => ({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId!,
        target: node.id,
        animated: node.status === 'continuing',
        style: { stroke: node.status === 'accepted' ? '#dc2626' : '#141414', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: node.status === 'accepted' ? '#dc2626' : '#141414' },
      }));

    setReactFlowNodes(rfNodes);
    setReactFlowEdges(rfEdges);
  }, [nodes, setReactFlowNodes, setReactFlowEdges]);

  const isRCAComplete = useMemo(() => {
    if (nodes.length === 0) return false;
    const leafNodes = nodes.filter(node => !reactFlowEdges.some(edge => edge.source === node.id));
    return leafNodes.length > 0 && leafNodes.every(n => 
      n.status === 'accepted' || n.status === 'terminated' || n.status === 'merged'
    );
  }, [nodes, reactFlowEdges]);

  // Update header button state
  useEffect(() => {
    const btn = document.getElementById('complete-rca-btn') as HTMLButtonElement;
    if (btn) btn.disabled = !isRCAComplete;
  }, [isRCAComplete]);

  // Listen for complete-rca event
  useEffect(() => {
    const handleComplete = () => {
      if (isRCAComplete) {
        alert("Root Cause Analysis Completed Successfully! You can now proceed to the Action Plan.");
      }
    };
    window.addEventListener('complete-rca', handleComplete);
    return () => window.removeEventListener('complete-rca', handleComplete);
  }, [isRCAComplete]);

  const onConnect = useCallback(
    (params: Connection) => setReactFlowEdges((eds) => addEdge(params, eds)),
    [setReactFlowEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setContextMenu(null);
    setShowManualInput(false);
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedNodeId(null);
    setShowManualInput(false);
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleContinue = async () => {
    if (!selectedNode || selectedNode.layer >= 5) return;
    setIsGenerating(true);
    try {
      const subCauses = await geminiService.generateSubCauses(selectedNode.label, incident, selectedNode.layer + 1);
      addNodes(subCauses, selectedNode.id);
      updateNode(selectedNode.id, { status: 'continuing' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { status: 'accepted' });
    setIsGenerating(true);
    try {
      const actions = await geminiService.suggestActions(selectedNode.label);
      setSuggestedActions(actions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddAction = (action: { action: string; description: string }) => {
    if (!selectedNode) return;
    addAction({
      id: Math.random().toString(36).substr(2, 9),
      rootCauseId: selectedNode.id,
      rootCauseLabel: selectedNode.label,
      action: action.action,
      description: action.description,
      owner: '',
      deadline: '',
      status: 'pending'
    });
    setSuggestedActions(prev => prev.filter(a => a.action !== action.action));
  };

  const handleTerminate = () => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { status: 'terminated' });
  };

  const handleManualSubmit = () => {
    if (!manualLabel) return;
    const newNode: CauseNode = {
      id: `manual-${Math.random().toString(36).substr(2, 9)}`,
      label: manualLabel,
      description: manualDesc || "Manually added cause",
      status: 'pending',
      layer: selectedNode ? selectedNode.layer + 1 : 1,
      parentId: selectedNode?.id
    };
    addNodes([newNode], selectedNode?.id || '');
    setShowManualInput(false);
    setManualLabel('');
    setManualDesc('');
    if (selectedNode) updateNode(selectedNode.id, { status: 'continuing' });
  };

  const handleMerge = (targetId: string) => {
    if (!selectedNodeId) return;
    mergeNodes(selectedNodeId, targetId);
    updateNode(selectedNodeId, { status: 'merged' });
    setShowMergeModal(false);
    setSelectedNodeId(targetId);
  };

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => 
      n.id !== selectedNodeId && 
      (n.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
       n.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [nodes, searchQuery, selectedNodeId]);

  return (
    <div className="flex h-full relative" onClick={(e) => {
      if (e.target === e.currentTarget) onPaneClick();
    }}>
      <div className="flex-grow h-full bg-slate-50 relative">
        {/* Floating Incident Description */}
        <div className="absolute top-6 left-6 z-10 max-w-xl">
          <div className="bg-white/90 backdrop-blur-md border-2 border-slate-900 p-4 shadow-2xl rounded-lg">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Incident</h3>
            <p className="text-sm font-bold text-slate-900 leading-tight">{incident}</p>
          </div>
        </div>

        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          fitView
        >
          <Background color="#aaa" gap={20} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white border-2 border-slate-900 shadow-2xl py-2 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={() => {
              setSelectedNodeId(contextMenu.nodeId);
              setShowManualInput(true);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-slate-100 flex items-center gap-2"
          >
            <Plus className="w-3 h-3" /> Add Sub-Cause
          </button>
        </div>
      )}

      {/* Merge Modal */}
      <AnimatePresence>
        {showMergeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-slate-900 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Merge Analysis</h3>
                  <h2 className="text-xl font-black uppercase">Select Target Node</h2>
                </div>
                <button onClick={() => setShowMergeModal(false)} className="p-2 hover:bg-slate-200 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-4 bg-white border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Search nodes by title or description..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-2 space-y-1">
                {filteredNodes.length > 0 ? (
                  filteredNodes.map(node => (
                    <button
                      key={node.id}
                      onClick={() => handleMerge(node.id)}
                      className="w-full text-left p-4 hover:bg-slate-50 rounded-lg border-2 border-transparent hover:border-slate-900 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-black uppercase group-hover:text-blue-600">{node.label}</span>
                        <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">LAYER {node.layer}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 italic">"{node.description}"</p>
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold">No matching nodes found</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            exit={{ x: 500 }}
            className="w-[500px] bg-white border-l-4 border-slate-900 shadow-2xl p-8 overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-mono font-bold rounded">LAYER {selectedNode.layer}</span>
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase",
                    selectedNode.status === 'accepted' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                  )}>{selectedNode.status}</span>
                </div>
                <h2 className={cn(
                  "text-2xl font-black leading-tight tracking-tighter uppercase",
                  selectedNode.status === 'accepted' && "text-red-600"
                )}>{selectedNode.label}</h2>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              <section>
                <h4 className="text-[10px] font-black uppercase mb-3 text-slate-400 tracking-widest">Analysis Details</h4>
                <div className={cn(
                  "text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border-l-4 shadow-inner",
                  selectedNode.status === 'accepted' ? "border-red-600 text-red-900" : "border-slate-200 text-slate-800"
                )}>
                  {selectedNode.description}
                </div>
              </section>

              {/* Action Buttons (Disabled if Merged) */}
              <section className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleContinue}
                  disabled={isGenerating || selectedNode.layer >= 5 || selectedNode.status !== 'pending'}
                  className="flex flex-col items-center justify-center gap-1.5 bg-blue-600 text-white p-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-blue-100"
                >
                  <ArrowRight className="w-4 h-4" /> Continue RCA
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isGenerating || selectedNode.status !== 'pending'}
                  className="flex flex-col items-center justify-center gap-1.5 bg-red-600 text-white p-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-red-100"
                >
                  <Check className="w-4 h-4" /> Accept RC
                </button>
                <button
                  onClick={handleTerminate}
                  disabled={selectedNode.status !== 'pending'}
                  className="flex flex-col items-center justify-center gap-1.5 bg-slate-900 text-white p-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                >
                  <Trash2 className="w-4 h-4" /> Terminate
                </button>
                <button
                  onClick={() => setShowMergeModal(true)}
                  disabled={selectedNode.status !== 'pending'}
                  className="flex flex-col items-center justify-center gap-1.5 border-2 border-slate-900 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                >
                  <GitMerge className="w-4 h-4" /> Merge Node
                </button>
                <button
                  onClick={() => setShowManualInput(true)}
                  disabled={selectedNode.status !== 'pending'}
                  className="flex flex-col items-center justify-center gap-1.5 bg-emerald-600 text-white p-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-emerald-100"
                >
                  <Plus className="w-4 h-4" /> Add Sub-Cause
                </button>
              </section>

              {showManualInput && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50 p-6 rounded-xl border-2 border-slate-900 space-y-4"
                >
                  <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Add Manual Sub-Cause</h4>
                  <div className="space-y-3">
                    <input 
                      type="text"
                      placeholder="Cause Label (e.g., Mechanical Fatigue)"
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-slate-900 outline-none"
                      value={manualLabel}
                      onChange={(e) => setManualLabel(e.target.value)}
                    />
                    <textarea 
                      placeholder="Detailed description of the cause..."
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm min-h-[100px] focus:border-slate-900 outline-none"
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={handleManualSubmit}
                        className="flex-grow bg-slate-900 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800"
                      >
                        Create Node
                      </button>
                      <button 
                        onClick={() => setShowManualInput(false)}
                        className="px-4 py-3 border-2 border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}

              {selectedNode.status === 'merged' && (
                <div className="bg-slate-100 border-2 border-slate-300 p-4 rounded-xl flex items-center gap-3">
                  <GitMerge className="w-6 h-6 text-slate-400" />
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-500">Node Merged</div>
                    <div className="text-xs text-slate-600">This node has been merged and is no longer actionable.</div>
                  </div>
                </div>
              )}

              {selectedNode.status === 'terminated' && (
                <section className="bg-slate-100 p-4 rounded border border-slate-200">
                  <h4 className="text-[10px] font-bold uppercase mb-2 text-slate-500">Termination Proof</h4>
                  <input 
                    type="text" 
                    placeholder="Enter remark for termination..." 
                    className="w-full text-xs p-2 border border-slate-300 rounded mb-2"
                  />
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <input type="file" className="hidden" id="proof-upload" />
                    <label htmlFor="proof-upload" className="cursor-pointer bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50">
                      Upload Proof (PDF/Image)
                    </label>
                    <span className="italic opacity-60">Non-mandatory</span>
                  </div>
                </section>
              )}

              {isGenerating && (
                <div className="flex items-center gap-2 text-xs font-mono animate-pulse text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  AI Analyzing CCPS/API Knowledge Base...
                </div>
              )}

              {suggestedActions.length > 0 && (
                <section className="mt-8 border-t pt-6 border-slate-200">
                  <h4 className="text-[10px] font-bold uppercase mb-4 text-slate-500 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-600" /> Suggested Corrective Actions
                  </h4>
                  <div className="space-y-3">
                    {suggestedActions.map((action, idx) => (
                      <div key={idx} className="p-3 border border-slate-200 rounded hover:border-red-600 transition-colors group">
                        <div className="font-bold text-xs mb-1">{action.action}</div>
                        <div className="text-[10px] text-slate-500 mb-2">{action.description}</div>
                        <button
                          onClick={() => handleAddAction(action)}
                          className="text-[10px] font-bold text-red-600 uppercase tracking-tighter flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="w-3 h-3" /> Add to Action Plan
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RCATree;

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CauseNode } from '../services/gemini';
import { cn } from '../lib/utils';
import { AlertCircle, CheckCircle2, XCircle, ArrowRightCircle, GitMerge } from 'lucide-react';

const CustomNode = ({ data }: NodeProps<CauseNode>) => {
  const isAccepted = data.status === 'accepted';
  const isTerminated = data.status === 'terminated';
  const isContinuing = data.status === 'continuing';
  const isMerged = data.status === 'merged';

  // Branch colors based on root ancestor (simplified logic using layer/id hash)
  const branchColors = [
    'border-blue-500 bg-blue-50',
    'border-emerald-500 bg-emerald-50',
    'border-amber-500 bg-amber-50',
    'border-purple-500 bg-purple-50',
    'border-cyan-500 bg-cyan-50',
  ];
  
  const getBranchColor = () => {
    // Use the branchIndex passed from RCATree
    const index = (data as CauseNode & { branchIndex: number }).branchIndex % branchColors.length;
    const baseColor = branchColors[index];
    
    if (isAccepted) return baseColor; // Maintain same fill/border as branch
    if (isTerminated) return `${baseColor} opacity-90`;
    if (isMerged) return 'border-slate-400 bg-slate-100 opacity-50';
    
    return baseColor;
  };

  return (
    <div className={cn(
      "px-5 py-4 shadow-xl rounded-lg border-2 min-w-[240px] max-w-[300px] transition-all hover:shadow-2xl relative overflow-hidden",
      getBranchColor()
    )}>
      {/* Diagonal Cross for Terminated - More Visible */}
      {isTerminated && (
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="6" className="text-slate-900 opacity-60" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="6" className="text-slate-900 opacity-60" />
          </svg>
        </div>
      )}

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-800 border-2 border-white" />
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {isAccepted && <AlertCircle className="w-5 h-5 text-red-600" />}
          {isTerminated && <XCircle className="w-5 h-5 text-slate-500" />}
          {isContinuing && <ArrowRightCircle className="w-5 h-5 text-blue-500" />}
          {isMerged && <GitMerge className="w-5 h-5 text-slate-400" />}
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
            L{data.layer}
          </span>
        </div>
        {data.status === 'pending' && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          </div>
        )}
      </div>

      <div className={cn(
        "font-extrabold text-base leading-tight mb-2 break-words",
        isAccepted ? "text-red-600" : "text-slate-900"
      )}>
        {data.label}
      </div>
      
      <div className="text-xs text-slate-600 leading-relaxed line-clamp-3 border-t border-slate-100 pt-2 mt-2">
        {data.description}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-800 border-2 border-white" />
    </div>
  );
};

export default memo(CustomNode);

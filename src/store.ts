import { create } from 'zustand';
import { CauseNode } from './services/gemini';

export interface ActionItem {
  id: string;
  rootCauseId: string;
  rootCauseLabel: string;
  action: string;
  description: string;
  owner: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface SavedRCA {
  id: string;
  name: string;
  incident: string;
  nodes: CauseNode[];
  actions: ActionItem[];
  timestamp: string;
}

interface RCAState {
  incident: string;
  nodes: CauseNode[];
  actions: ActionItem[];
  isAnalyzing: boolean;
  savedRCAs: SavedRCA[];
  currentRCAId: string | null;
  
  setIncident: (incident: string) => void;
  setNodes: (nodes: CauseNode[]) => void;
  addNodes: (newNodes: CauseNode[], parentId: string) => void;
  updateNode: (id: string, updates: Partial<CauseNode>) => void;
  mergeNodes: (sourceId: string, targetId: string) => void;
  addAction: (action: ActionItem) => void;
  saveCurrentRCA: (name: string) => { success: boolean; message: string };
  loadRCA: (id: string) => void;
  deleteRCA: (id: string) => void;
  reset: () => void;
}

const STORAGE_KEY = 'petroguard_saved_rcas';

const getSavedRCAsFromStorage = (): SavedRCA[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load saved RCAs from storage', e);
    return [];
  }
};

const saveRCAsToStorage = (rcas: SavedRCA[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rcas));
  } catch (e) {
    console.error('Failed to save RCAs to storage', e);
  }
};

export const useRCAStore = create<RCAState>((set, get) => ({
  incident: '',
  nodes: [],
  actions: [],
  isAnalyzing: false,
  savedRCAs: getSavedRCAsFromStorage(),
  currentRCAId: null,

  setIncident: (incident) => set({ incident }),
  setNodes: (nodes) => set({ nodes }),
  
  addNodes: (newNodes, parentId) => set((state) => ({
    nodes: [...state.nodes, ...newNodes.map(n => ({ ...n, parentId }))]
  })),

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map(node => node.id === id ? { ...node, ...updates } : node)
  })),

  mergeNodes: (sourceId, targetId) => set((state) => {
    const sourceNode = state.nodes.find(n => n.id === sourceId);
    if (!sourceNode) return state;
    
    return {
      nodes: state.nodes.map(node => {
        if (node.id === targetId) {
          return {
            ...node,
            description: `${node.description}\n\nMerged from: ${sourceNode.label} - ${sourceNode.description}`
          };
        }
        if (node.id === sourceId) {
          return {
            ...node,
            status: 'merged'
          };
        }
        return node;
      })
    };
  }),

  addAction: (action) => set((state) => ({
    actions: [...state.actions, action]
  })),

  saveCurrentRCA: (name) => {
    const state = get();
    const savedRCAs = [...state.savedRCAs];
    
    // Check if we are updating an existing one or creating a new one
    const existingIndex = state.currentRCAId 
      ? savedRCAs.findIndex(r => r.id === state.currentRCAId) 
      : -1;

    if (existingIndex === -1 && savedRCAs.length >= 10) {
      return { success: false, message: 'Maximum limit of 10 saved RCAs reached. Please delete an existing one first.' };
    }

    const newRCA: SavedRCA = {
      id: state.currentRCAId || Math.random().toString(36).substr(2, 9),
      name,
      incident: state.incident,
      nodes: state.nodes,
      actions: state.actions,
      timestamp: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      savedRCAs[existingIndex] = newRCA;
    } else {
      savedRCAs.push(newRCA);
    }

    saveRCAsToStorage(savedRCAs);
    set({ savedRCAs, currentRCAId: newRCA.id });
    return { success: true, message: 'RCA saved successfully.' };
  },

  loadRCA: (id) => {
    const state = get();
    const rca = state.savedRCAs.find(r => r.id === id);
    if (rca) {
      set({
        incident: rca.incident,
        nodes: rca.nodes,
        actions: rca.actions,
        currentRCAId: rca.id
      });
    }
  },

  deleteRCA: (id) => {
    const state = get();
    const savedRCAs = state.savedRCAs.filter(r => r.id !== id);
    saveRCAsToStorage(savedRCAs);
    set({ 
      savedRCAs, 
      currentRCAId: state.currentRCAId === id ? null : state.currentRCAId 
    });
  },

  reset: () => set({ incident: '', nodes: [], actions: [], isAnalyzing: false, currentRCAId: null })
}));

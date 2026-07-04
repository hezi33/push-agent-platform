import { create } from 'zustand';
import type { ChatMessage, PipelineAgent } from '../mocks/data/agentWorkbench';

interface WorkbenchState {
  messages: ChatMessage[];
  pipeline: PipelineAgent[];
  visibleLogs: unknown[];
  alertId: string | null;

  setMessages: (msgs: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setPipeline: (p: PipelineAgent[]) => void;
  setVisibleLogs: (logs: unknown[]) => void;
  setAlertId: (id: string | null) => void;
  clear: () => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  messages: [],
  pipeline: [],
  visibleLogs: [],
  alertId: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setPipeline: (pipeline) => set({ pipeline }),
  setVisibleLogs: (visibleLogs) => set({ visibleLogs }),
  setAlertId: (alertId) => set({ alertId }),
  clear: () => set({ messages: [], pipeline: [], visibleLogs: [], alertId: null }),
}));

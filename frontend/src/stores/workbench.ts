import { create } from 'zustand';
import type { PipelineAgent } from '../mocks/data/agentWorkbench';

interface WorkbenchState {
  messages: any[];
  pipeline: PipelineAgent[];
  visibleLogs: unknown[];
  alertId: string | null;
  /** 告警上下文（从 Dashboard 传入） */
  alertContext: { level: string; metric: string; dim: string; loss: number } | null;

  setMessages: (msgs: any[]) => void;
  addMessage: (msg: any) => void;
  setPipeline: (p: PipelineAgent[]) => void;
  setVisibleLogs: (logs: unknown[]) => void;
  setAlertId: (id: string | null) => void;
  setAlertContext: (ctx: { level: string; metric: string; dim: string; loss: number } | null) => void;
  clear: () => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  messages: [],
  pipeline: [],
  visibleLogs: [],
  alertId: null,
  alertContext: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setPipeline: (pipeline) => set({ pipeline }),
  setVisibleLogs: (visibleLogs) => set({ visibleLogs }),
  setAlertId: (alertId) => set({ alertId }),
  setAlertContext: (alertContext) => set({ alertContext }),
  clear: () => set({ messages: [], pipeline: [], visibleLogs: [], alertId: null, alertContext: null }),
}));

/* ------------------------------------------------------------------ */
/*  Orchestration Service — pipeline map in unified Store              */
/* ------------------------------------------------------------------ */

import { Store } from './store';

export interface WorkflowStep {
  id: string;
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'rejected';
  inputRefs: string[];
  outputRefs: string[];
  approvedBy?: string;
  timestamp: string;
}

export interface Pipeline {
  roomId: string;
  steps: WorkflowStep[];
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}

const defaultSteps = (): WorkflowStep[] => [
  { id: 'step_1', name: 'Ingestion & Indexing', agent: 'IngestionAgent', status: 'pending', inputRefs: ['docs'], outputRefs: ['chunks'], timestamp: new Date().toISOString() },
  { id: 'step_2', name: 'Verification Scan', agent: 'AuditAgent', status: 'pending', inputRefs: ['chunks'], outputRefs: ['verified_docs'], timestamp: new Date().toISOString() },
  { id: 'step_3', name: 'AI Analysis', agent: 'ProofEngine', status: 'pending', inputRefs: ['verified_docs'], outputRefs: ['analysis_runs'], timestamp: new Date().toISOString() },
  { id: 'step_4', name: 'Approval Gate', agent: 'HumanGate', status: 'pending', inputRefs: ['analysis_runs'], outputRefs: ['approved_runs'], timestamp: new Date().toISOString() },
  { id: 'step_5', name: 'Report Generation', agent: 'ReportAgent', status: 'pending', inputRefs: ['approved_runs'], outputRefs: ['published_report'], timestamp: new Date().toISOString() },
];

export const OrchestrationService = {
  createPipeline: (roomId: string): Pipeline => {
    const p: Pipeline = {
      roomId,
      steps: defaultSteps(),
      currentStep: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = Store.getMap<Pipeline>('pipelines');
    all[roomId] = p;
    Store.setMap('pipelines', all);
    return p;
  },

  getPipeline: (roomId: string): Pipeline => {
    const all = Store.getMap<Pipeline>('pipelines');
    return all[roomId] || OrchestrationService.createPipeline(roomId);
  },

  advanceStep: (roomId: string, stepId?: string): Pipeline => {
    const p = OrchestrationService.getPipeline(roomId);
    const idx = stepId
      ? p.steps.findIndex(s => s.id === stepId)
      : p.steps.findIndex(s => s.status !== 'completed' && s.status !== 'rejected');
    if (idx < 0) return p;
    // idempotent: already completed
    if (p.steps[idx].status === 'completed') return p;
    const steps = p.steps.map((s, i) => {
      if (i === idx) return { ...s, status: 'completed' as const, timestamp: new Date().toISOString() };
      if (i === idx + 1 && s.status === 'pending') return { ...s, status: 'running' as const, timestamp: new Date().toISOString() };
      return s;
    });
    const updated: Pipeline = {
      ...p,
      steps,
      currentStep: Math.min(idx + 1, steps.length - 1),
      updatedAt: new Date().toISOString(),
    };
    const all = Store.getMap<Pipeline>('pipelines');
    all[roomId] = updated;
    Store.setMap('pipelines', all);
    return updated;
  },

  rejectStep: (roomId: string, stepId: string, by?: string): Pipeline => {
    const p = OrchestrationService.getPipeline(roomId);
    const steps = p.steps.map(s =>
      s.id === stepId
        ? { ...s, status: 'rejected' as const, approvedBy: by, timestamp: new Date().toISOString() }
        : s
    );
    const updated: Pipeline = { ...p, steps, updatedAt: new Date().toISOString() };
    const all = Store.getMap<Pipeline>('pipelines');
    all[roomId] = updated;
    Store.setMap('pipelines', all);
    return updated;
  },

  reset: (roomId: string): Pipeline => OrchestrationService.createPipeline(roomId),
};

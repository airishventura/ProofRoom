/* ------------------------------------------------------------------ */
/*  Orchestration Service — Agent workflow pipeline                      */
/* ------------------------------------------------------------------ */

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

export const OrchestrationService = {
  createPipeline: (roomId: string): Pipeline => ({
    roomId,
    steps: [
      { id: 'step_1', name: 'Ingestion & Indexing', agent: 'IngestionAgent', status: 'pending', inputRefs: ['docs'], outputRefs: ['chunks'], timestamp: new Date().toISOString() },
      { id: 'step_2', name: 'Verification Scan', agent: 'AuditAgent', status: 'pending', inputRefs: ['chunks'], outputRefs: ['verified_docs'], timestamp: new Date().toISOString() },
      { id: 'step_3', name: 'AI Analysis', agent: 'ProofEngine', status: 'pending', inputRefs: ['verified_docs'], outputRefs: ['analysis_runs'], timestamp: new Date().toISOString() },
      { id: 'step_4', name: 'Approval Gate', agent: 'HumanGate', status: 'pending', inputRefs: ['analysis_runs'], outputRefs: ['approved_runs'], timestamp: new Date().toISOString() },
      { id: 'step_5', name: 'Report Generation', agent: 'ReportAgent', status: 'pending', inputRefs: ['approved_runs'], outputRefs: ['published_report'], timestamp: new Date().toISOString() },
    ],
    currentStep: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  getPipeline: (roomId: string): Pipeline => OrchestrationService.createPipeline(roomId),
  advanceStep: (roomId: string, stepId: string) => {
    const p = OrchestrationService.getPipeline(roomId);
    const updated = p.steps.map(s => s.id === stepId ? { ...s, status: 'completed' as const, timestamp: new Date().toISOString() } : s);
    return { ...p, steps: updated, currentStep: p.currentStep + 1, updatedAt: new Date().toISOString() };
  },
};

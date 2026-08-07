/** Shared AI task catalog — Tasks panel + future Gates panel. */
export type WorkspaceTaskStatus = 'ready' | 'gated';

export interface WorkspaceTask {
  title: string;
  desc: string;
  status: WorkspaceTaskStatus;
  modelPath: string;
}

export const WORKSPACE_TASKS: readonly WorkspaceTask[] = [
  {
    title: 'Summarization',
    desc: 'Executive summaries from uploaded notes.',
    status: 'ready',
    modelPath: 'models/proof-v2/exec-summary',
  },
  {
    title: 'Q&A Across Docs',
    desc: 'Natural-language questions across files.',
    status: 'ready',
    modelPath: 'models/proof-v2/qa',
  },
  {
    title: 'Data Extraction',
    desc: 'Pull structured metrics and clauses.',
    status: 'ready',
    modelPath: 'models/proof-v2/extract',
  },
  {
    title: 'Red-Flag Detection',
    desc: 'Scan for risk language.',
    status: 'ready',
    modelPath: 'models/proof-v2/redflag-v1',
  },
  {
    title: 'Memo Drafting',
    desc: 'Client-ready memos with citations.',
    status: 'gated',
    modelPath: 'models/proof-v2/memo',
  },
] as const;

export function gatedTasks(): WorkspaceTask[] {
  return WORKSPACE_TASKS.filter(t => t.status === 'gated');
}

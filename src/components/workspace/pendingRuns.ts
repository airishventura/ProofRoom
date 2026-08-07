import type { AIRunRecord } from '../../services/api';
import { WORKSPACE_TASKS, type WorkspaceTask } from './workspaceTasks';

/** Same filter as Approvals page: status === 'pending'. */
export function filterPendingRuns(runs: AIRunRecord[]): AIRunRecord[] {
  return runs.filter(r => r.status === 'pending');
}

/** Catalog tasks that require approval gate. */
export function catalogGatedTasks(): WorkspaceTask[] {
  return WORKSPACE_TASKS.filter(t => t.status === 'gated');
}

export function gatesSummary(runs: AIRunRecord[]): {
  pendingRuns: AIRunRecord[];
  gatedTasks: WorkspaceTask[];
  pendingCount: number;
} {
  const pendingRuns = filterPendingRuns(runs);
  const gatedTasks = catalogGatedTasks();
  return {
    pendingRuns,
    gatedTasks,
    pendingCount: pendingRuns.length,
  };
}

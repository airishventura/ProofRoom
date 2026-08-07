import type { CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import type { AIRunRecord } from '../../services/api';
import type { WorkspaceTask } from './workspaceTasks';
import { Card, CardContent, CardHeader, CardTitle } from '../lib-ary/card/Card';
import { Tabs, TabsList, Tab, TabsPanel, TabsPanels } from '../lib-ary/tabs/Tabs';

const cardStyle = {
  width: '100%',
  maxWidth: 'none',
  '--lib-card-radius': '16px',
  '--lib-card-padding': '20px',
} as CSSProperties;

function TaskGrid(props: {
  tasks: readonly WorkspaceTask[];
  runs: AIRunRecord[];
  verifiedDocs: number;
  busyTask: string | null;
  onRunTask: (title: string, gated: boolean, modelPath: string) => void;
}) {
  const { tasks, runs, verifiedDocs, busyTask, onRunTask } = props;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tasks.map(task => {
        const existing = runs.find(r => r.title === task.title);
        const cost = existing?.cost || (task.status === 'gated' ? 'Approval gate' : '—');
        const meta = existing?.meta || (task.status === 'gated' ? 'Awaiting sign-off' : `${verifiedDocs} docs`);
        return (
          <button
            key={task.title}
            type="button"
            disabled={busyTask === task.title || existing?.status === 'running'}
            onClick={() => onRunTask(task.title, task.status === 'gated', task.modelPath)}
            className="group rounded-2xl border border-ink-faint/30 bg-paper-deep px-5 py-5 hover:border-gold/30 hover:-translate-y-0.5 transition-all duration-300 text-left disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-ink/5 border border-ink-faint/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-gold" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-ink">{task.title}</h4>
                  <span
                    className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      task.status === 'ready' ? 'bg-match-soft text-match' : 'bg-gold-soft text-gold-deep'
                    }`}
                  >
                    {busyTask === task.title || existing?.status === 'running' ? 'running' : task.status}
                  </span>
                </div>
                <p className="text-[11px] text-ink-soft leading-relaxed mb-2">{task.desc}</p>
                <div className="flex items-center gap-3 text-[10px] font-mono text-ink-faint">
                  <span>{meta}</span>
                  <span className="text-gold">{cost}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TasksPanel(props: {
  tasks: readonly WorkspaceTask[];
  runs: AIRunRecord[];
  verifiedDocs: number;
  busyTask: string | null;
  onRunTask: (title: string, gated: boolean, modelPath: string) => void;
}) {
  const ready = props.tasks.filter(t => t.status === 'ready');
  const gated = props.tasks.filter(t => t.status === 'gated');

  return (
    <Card className="pr-card-full" style={cardStyle}>
      <CardHeader>
        <CardTitle className="text-[11px] font-extrabold uppercase tracking-[0.15em] !text-ink-soft !font-extrabold">
          AI Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <Tab value="all">All</Tab>
            <Tab value="ready">Ready</Tab>
            <Tab value="gated">Gated</Tab>
          </TabsList>
          <TabsPanels>
            <TabsPanel value="all">
              <TaskGrid {...props} tasks={props.tasks} />
            </TabsPanel>
            <TabsPanel value="ready">
              <TaskGrid {...props} tasks={ready} />
            </TabsPanel>
            <TabsPanel value="gated">
              <TaskGrid {...props} tasks={gated} />
            </TabsPanel>
          </TabsPanels>
        </Tabs>
      </CardContent>
    </Card>
  );
}

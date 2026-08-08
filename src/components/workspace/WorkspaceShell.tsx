import type { ReactNode } from 'react';
import { Tabs, TabsList, Tab, TabsPanel, TabsPanels } from '../lib-ary/tabs/Tabs';

/**
 * PR-5 IA:
 * - Desktop (lg+): three panes — Sources | Work (tasks+chat) | Evidence+Gates
 * - Mobile: LibAry Tabs (Sources | Work | Evidence)
 */
export function WorkspaceShell(props: {
  header: ReactNode;
  pipeline?: ReactNode;
  sources: ReactNode;
  work: ReactNode;
  evidence: ReactNode;
  gates: ReactNode;
}) {
  const { header, pipeline, sources, work, evidence, gates } = props;

  return (
    <main className="mx-auto max-w-[1600px] px-3 sm:px-8 md:px-14 py-8 sm:py-10 md:py-16">
      {header}
      {pipeline}

      {/* Desktop three-pane */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(260px,340px)] gap-6 xl:gap-8 items-start">
        <aside className="space-y-5 min-w-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
          {sources}
        </aside>
        <div className="space-y-5 min-w-0">{work}</div>
        <aside className="space-y-5 min-w-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pl-1">
          {evidence}
          {gates}
        </aside>
      </div>

      {/* Mobile / tablet tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="work" className="w-full">
          <TabsList className="mb-4 w-full overflow-x-auto">
            <Tab value="sources">Sources</Tab>
            <Tab value="work">Work</Tab>
            <Tab value="evidence">Evidence</Tab>
          </TabsList>
          <TabsPanels>
            <TabsPanel value="sources" className="space-y-5">
              {sources}
            </TabsPanel>
            <TabsPanel value="work" className="space-y-5">
              {work}
            </TabsPanel>
            <TabsPanel value="evidence" className="space-y-5">
              {evidence}
              {gates}
            </TabsPanel>
          </TabsPanels>
        </Tabs>
      </div>
    </main>
  );
}

/**
 * Workspace page — controller + gates + three-pane shell (PR-5).
 */
import {
  useWorkspaceController,
  WorkspaceGateScreens,
  WorkspaceHeader,
  WorkspacePipeline,
  WorkspaceShell,
  SourcesPanel,
  EvidencePanel,
  TasksPanel,
  ChatPanel,
  GatesPanel,
} from '../components/workspace';

export default function WorkspacePage() {
  const c = useWorkspaceController();

  if (c.gateScreen) {
    return (
      <WorkspaceGateScreens
        gate={c.gateScreen}
        roomId={c.roomId}
        room={c.room}
        unlockPrivate={c.unlockPrivate}
      />
    );
  }

  return (
    <WorkspaceShell
      header={
        <WorkspaceHeader
          roomId={c.roomId}
          room={c.room}
          apiMode={c.apiMode}
          verifiedDocs={c.verifiedDocs}
          verifiedRuns={c.verifiedRuns}
          canPublish={c.canPublish}
          loadErr={c.loadErr}
        />
      }
      pipeline={<WorkspacePipeline pipeline={c.pipeline} />}
      sources={
        <SourcesPanel
          docs={c.docs}
          expandedDoc={c.expandedDoc}
          setExpandedDoc={c.setExpandedDoc}
          uploading={c.uploading}
          uploadErr={c.uploadErr}
          fileRef={c.fileRef}
          onPasteCopied={() => void c.handlePasteCopied()}
          onUploadClick={() => c.fileRef.current?.click()}
          onFileChange={file => void c.handleUpload(file)}
          onToggleVerify={id => void c.toggleDocVerification(id)}
        />
      }
      work={
        <>
          <TasksPanel
            tasks={c.tasks}
            runs={c.runs}
            verifiedDocs={c.verifiedDocs}
            busyTask={c.busyTask}
            onRunTask={(title, gated, modelPath) => void c.runTask(title, gated, modelPath)}
          />
          <ChatPanel
            roomId={c.roomId}
            apiMode={c.apiMode}
            chat={c.chat}
            input={c.input}
            setInput={c.setInput}
            streaming={c.streaming}
            onSend={() => void c.handleSend()}
            onChatFromClipboard={() => void c.handleChatFromClipboard()}
          />
        </>
      }
      evidence={
        <EvidencePanel
          runs={c.runs}
          expandedEvidence={c.expandedEvidence}
          setExpandedEvidence={c.setExpandedEvidence}
        />
      }
      gates={
        <GatesPanel
          runs={c.runs}
          busyTask={c.busyTask}
          onRunGatedTask={task => void c.runTask(task.title, true, task.modelPath)}
        />
      }
    />
  );
}

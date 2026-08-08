import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import { DocumentService, RunService, ChatService, RoomService } from '../../services/api';
import type { DocumentRecord, AIRunRecord, ChatMessage } from '../../services/api';
import { FileIngestionService, IngestError } from '../../services/ingestion-real';
import { ingestClipboardText } from '../../services/clipboard-ingest';
import { AuditService } from '../../services/audit';
import { RevenueService } from '../../services/revenue';
import { priceChat } from '../../utils/pricing';
import { OrchestrationService } from '../../services/orchestration';
import type { Pipeline } from '../../services/orchestration';
import { PublishService } from '../../services/publish';
import { answerWithCitations } from '../../services/retrieval';
import { useRoom } from '../../context/RoomContext';
import { useFeedback } from '../../context/FeedbackContext';
import { getToken, isApiMode, streamChat } from '../../services/http';
import { isRemoteReady, Remote } from '../../services/remote';
import { deriveGateScreen, pickExpandedId, type GateScreen } from './gateScreen';
import { WORKSPACE_TASKS } from './workspaceTasks';

export interface WorkspaceController {
  // room / auth (re-exported)
  roomId: string;
  room: ReturnType<typeof useRoom>['room'];
  accessGranted: boolean;
  unlockPrivate: () => boolean;
  apiMode: boolean;
  remoteReady: boolean;
  roomLoading: boolean;
  gateScreen: GateScreen;

  // data
  docs: DocumentRecord[];
  runs: AIRunRecord[];
  chat: ChatMessage[];
  pipeline: Pipeline | null;
  published: boolean;
  verifiedDocs: number;
  verifiedRuns: number;
  canPublish: boolean;

  // UI state
  input: string;
  setInput: (v: string) => void;
  expandedDoc: string;
  setExpandedDoc: (id: string) => void;
  expandedEvidence: string;
  setExpandedEvidence: (id: string) => void;
  uploading: boolean;
  uploadErr: string | null;
  busyTask: string | null;
  loadErr: string | null;
  streaming: boolean;
  fileRef: RefObject<HTMLInputElement | null>;

  // handlers
  refresh: () => Promise<void>;
  handleUpload: (file: File) => Promise<void>;
  handlePasteCopied: () => Promise<void>;
  handleChatFromClipboard: () => Promise<void>;
  handleSend: () => Promise<void>;
  toggleDocVerification: (id: string) => Promise<void>;
  runTask: (title: string, gated: boolean, modelPath: string) => Promise<void>;

  tasks: typeof WORKSPACE_TASKS;
}

export function useWorkspaceController(): WorkspaceController {
  const { roomId, room, accessGranted, unlockPrivate, refreshRooms, apiMode, remoteReady, loading: roomLoading } =
    useRoom();
  const { toast } = useFeedback();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [runs, setRuns] = useState<AIRunRecord[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string>('');
  const [expandedEvidence, setExpandedEvidence] = useState<string>('');
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const gateScreen = deriveGateScreen({ apiMode, roomLoading, remoteReady, accessGranted });

  const refresh = useCallback(async () => {
    setLoadErr(null);
    if (isRemoteReady()) {
      try {
        const [d, r, c] = await Promise.all([
          Remote.documents(roomId),
          Remote.runs(roomId),
          Remote.chatHistory(roomId),
        ]);
        setDocs(d);
        setRuns(r);
        setChat(c);
        setPipeline(null);
        try {
          const pub = await Remote.getPublished(roomId);
          setPublished(!!pub);
        } catch {
          setPublished(false);
        }
        setExpandedDoc(prev => pickExpandedId(prev, d.map(x => x.id)));
        setExpandedEvidence(prev => pickExpandedId(prev, r.map(x => x.id)));
        refreshRooms();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load workspace';
        setLoadErr(msg);
        toast(msg);
      }
      return;
    }

    const d = DocumentService.getAll(roomId);
    const r = RunService.getAll(roomId);
    setDocs(d);
    setRuns(r);
    setChat(ChatService.getAll(roomId));
    setPipeline(OrchestrationService.getPipeline(roomId));
    setPublished(PublishService.isPublished(roomId));
    setExpandedDoc(prev => pickExpandedId(prev, d.map(x => x.id)));
    setExpandedEvidence(prev => pickExpandedId(prev, r.map(x => x.id)));
    refreshRooms();
  }, [roomId, refreshRooms, toast]);

  useEffect(() => {
    if (roomLoading) return;
    if (apiMode && !remoteReady) return;
    void refresh();
  }, [refresh, roomLoading, apiMode, remoteReady]);

  useEffect(() => {
    const onReset = () => {
      void refresh();
    };
    window.addEventListener('proofroom:room-reset', onReset);
    return () => window.removeEventListener('proofroom:room-reset', onReset);
  }, [refresh]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!accessGranted) {
        setUploadErr(apiMode ? 'Sign in first.' : 'Unlock private endpoint first.');
        return;
      }
      setUploading(true);
      setUploadErr(null);
      try {
        await FileIngestionService.ingestFile(file, room?.endpoint || 'private', roomId);
        await refresh();
      } catch (e) {
        const msg = e instanceof IngestError || e instanceof Error ? e.message : 'Ingest failed.';
        setUploadErr(msg);
        toast(msg);
      } finally {
        setUploading(false);
      }
    },
    [accessGranted, apiMode, refresh, room?.endpoint, roomId, toast]
  );

  const handlePasteCopied = useCallback(async () => {
    if (!accessGranted) {
      const msg = apiMode ? 'Sign in first.' : 'Unlock private endpoint first.';
      setUploadErr(msg);
      toast(msg);
      return;
    }
    setUploading(true);
    setUploadErr(null);
    try {
      const text = await navigator.clipboard.readText();
      await ingestClipboardText(text, room?.endpoint || 'private', roomId);
      await refresh();
      toast('Clipboard ingested as document');
    } catch (e) {
      // Status only — never toast clipboard body
      const msg =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Clipboard permission denied. Allow paste, or use Upload.'
          : e instanceof IngestError || e instanceof Error
            ? e.message
            : 'Could not read clipboard.';
      setUploadErr(msg);
      toast(msg);
    } finally {
      setUploading(false);
    }
  }, [accessGranted, apiMode, refresh, room?.endpoint, roomId, toast]);

  const handleChatFromClipboard = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setUploadErr('Clipboard is empty.');
        toast('Clipboard is empty');
        return;
      }
      setInput(text.slice(0, 4000));
      setUploadErr(null);
      // Do not toast clipboard content
      toast('Pasted into chat input');
    } catch {
      const msg = 'Could not read clipboard for chat.';
      setUploadErr(msg);
      toast(msg);
    }
  }, [toast]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !accessGranted || streaming) return;
    const q = input.trim();
    setInput('');

    // Dual-mode: server stream when API + JWT (predicate kept byte-identical)
    if (isApiMode() && getToken()) {
      const userMsg: ChatMessage = {
        role: 'user',
        text: q,
        verified: false,
        receipt: '',
        timestamp: new Date().toISOString(),
        roomId,
      };
      const placeholder: ChatMessage = {
        role: 'agent',
        text: '',
        verified: false,
        receipt: '',
        timestamp: new Date().toISOString(),
        roomId,
      };
      setChat(c => [...c, userMsg, placeholder]);
      setStreaming(true);
      try {
        let acc = '';
        const meta = await streamChat(roomId, q, delta => {
          acc += delta;
          setChat(c => {
            const next = [...c];
            next[next.length - 1] = { ...placeholder, text: acc };
            return next;
          });
        });
        const finalMsg: ChatMessage = {
          role: 'agent',
          text: acc,
          verified: true,
          receipt: meta.receipt || '',
          timestamp: new Date().toISOString(),
          roomId,
        };
        setChat(c => {
          const next = [...c];
          next[next.length - 1] = finalMsg;
          return next;
        });
      } catch (e) {
        const errText = e instanceof Error ? e.message : 'Stream failed';
        toast(errText);
        setChat(c => {
          const next = [...c];
          next[next.length - 1] = {
            role: 'agent',
            text: `Error: ${errText}`,
            roomId,
            timestamp: new Date().toISOString(),
          };
          return next;
        });
      } finally {
        setStreaming(false);
      }
      return;
    }

    // Local retrieval fallback
    const msg: ChatMessage = {
      role: 'user',
      text: q,
      verified: false,
      receipt: '',
      timestamp: new Date().toISOString(),
      roomId,
    };
    ChatService.add(msg);
    setChat(c => [...c, msg]);

    setTimeout(() => {
      const currentDocs = DocumentService.getAll(roomId);
      const ans = answerWithCitations(q, currentDocs);
      const receipt = '#REC-' + Math.floor(Math.random() * 9000 + 1000);
      const resp: ChatMessage = {
        role: 'agent',
        text: ans.text,
        verified: ans.citations.length > 0,
        receipt,
        timestamp: new Date().toISOString(),
        roomId,
      };
      ChatService.add(resp);
      setChat(c => [...c, resp]);
      const priced = priceChat({ outputText: ans.text, inputText: q });
      RevenueService.recordUsage(roomId, priced.amountUsd, `Chat (${priced.tokens} tok)`);
      RoomService.syncStats(roomId);
      AuditService.log({
        type: 'ai_run',
        roomId,
        action: `Chat Q&A: ${q.slice(0, 60)}`,
        actor: 'ProofEngine v2',
        modelPath: 'models/proof-v2/chat',
        receiptId: receipt,
        cost: priced.cost,
        tokens: priced.tokens,
        evidenceRefs: ans.citations.map(c => c.docId),
      });
    }, 500);
  }, [accessGranted, input, roomId, streaming, toast]);

  const toggleDocVerification = useCallback(
    async (id: string) => {
      if (!accessGranted) return;
      const doc = docs.find(d => d.id === id);
      if (!doc) return;

      if (isRemoteReady()) {
        if (!doc.verified) {
          try {
            await Remote.verifyDocument(id);
            await refresh();
            toast(`Verified ${doc.name}`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Verify failed';
            setUploadErr(msg);
            toast(msg);
          }
        }
        return;
      }

      if (!doc.verified) {
        DocumentService.verify(id, roomId);
        AuditService.log({
          type: 'document_verified',
          roomId,
          action: `Verified document ${doc.name}`,
          actor: 'AuditAgent',
          receiptId: '#VER-' + Math.floor(Math.random() * 9000 + 1000),
          cost: '$0.00',
          evidenceRefs: [id],
        });
        const p = OrchestrationService.getPipeline(roomId);
        if (p.steps[1]?.status === 'pending' || p.steps[1]?.status === 'running') {
          OrchestrationService.advanceStep(roomId, 'step_2');
        }
      } else {
        DocumentService.unverify(id);
      }
      await refresh();
    },
    [accessGranted, docs, refresh, roomId, toast]
  );

  const runTask = useCallback(
    async (title: string, gated: boolean, modelPath: string) => {
      if (!accessGranted || busyTask) return;
      setBusyTask(title);

      if (isRemoteReady()) {
        try {
          await Remote.createRun(roomId, title, { gated, modelPath });
          await refresh();
          toast(gated ? `Queued for approval: ${title}` : `Started: ${title}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Task failed';
          setLoadErr(msg);
          toast(msg);
        } finally {
          setBusyTask(null);
        }
        return;
      }

      const run = RunService.create(title, { gated, modelPath, roomId });
      setRuns(RunService.getAll(roomId));

      if (gated) {
        AuditService.log({
          type: 'approval',
          roomId,
          action: `Gated task queued: ${title}`,
          actor: 'HumanGate',
          modelPath,
          receiptId: '#GATE-' + Math.floor(Math.random() * 9000 + 1000),
          cost: '—',
          evidenceRefs: [run.id],
        });
        OrchestrationService.advanceStep(roomId, 'step_3');
        setBusyTask(null);
        await refresh();
        return;
      }

      RunService.trigger(run.id, done => {
        // Revenue already recorded in RunService.trigger via token pricing
        AuditService.log({
          type: 'ai_run',
          roomId,
          action: `Completed ${done.title}`,
          actor: done.model,
          modelPath: done.evidence.modelPath,
          receiptId: done.receipt,
          cost: done.cost,
          tokens: done.tokens,
          evidenceRefs: [done.id],
        });
        OrchestrationService.advanceStep(roomId, 'step_3');
        setBusyTask(null);
        void refresh();
      });
      await refresh();
    },
    [accessGranted, busyTask, refresh, roomId, toast]
  );

  const verifiedDocs = docs.filter(d => d.verified).length;
  const verifiedRuns = runs.filter(r => r.status === 'verified').length;
  const canPublish = verifiedRuns > 0 && !published;

  return {
    roomId,
    room,
    accessGranted,
    unlockPrivate,
    apiMode,
    remoteReady,
    roomLoading,
    gateScreen,
    docs,
    runs,
    chat,
    pipeline,
    published,
    verifiedDocs,
    verifiedRuns,
    canPublish,
    input,
    setInput,
    expandedDoc,
    setExpandedDoc,
    expandedEvidence,
    setExpandedEvidence,
    uploading,
    uploadErr,
    busyTask,
    loadErr,
    streaming,
    fileRef,
    refresh,
    handleUpload,
    handlePasteCopied,
    handleChatFromClipboard,
    handleSend,
    toggleDocVerification,
    runTask,
    tasks: WORKSPACE_TASKS,
  };
}

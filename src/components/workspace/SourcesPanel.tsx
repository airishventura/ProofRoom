import type { CSSProperties, RefObject } from 'react';
import { Upload, ClipboardPaste } from 'lucide-react';
import type { DocumentRecord } from '../../services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../lib-ary/card/Card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../lib-ary/accordion/Accordion';
import { Button } from '../lib-ary/button/Button';

const cardStyle = {
  width: '100%',
  maxWidth: 'none',
  '--lib-card-radius': '16px',
  '--lib-card-padding': '20px',
} as CSSProperties;

export function SourcesPanel(props: {
  docs: DocumentRecord[];
  expandedDoc: string;
  setExpandedDoc: (id: string) => void;
  uploading: boolean;
  uploadErr: string | null;
  fileRef: RefObject<HTMLInputElement | null>;
  onPasteCopied: () => void;
  onUploadClick: () => void;
  onFileChange: (file: File) => void;
  onToggleVerify: (id: string) => void;
}) {
  const {
    docs,
    expandedDoc,
    setExpandedDoc,
    uploading,
    uploadErr,
    fileRef,
    onPasteCopied,
    onUploadClick,
    onFileChange,
    onToggleVerify,
  } = props;

  return (
    <Card className="pr-card-full" style={cardStyle}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-[11px] font-extrabold uppercase tracking-[0.15em] !text-ink-soft !font-extrabold">
            Documents
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              title="Ingest last copied text from clipboard"
              onClick={onPasteCopied}
              className="!px-2.5 !py-1.5 !text-[10px] !font-bold"
            >
              <ClipboardPaste className="h-3 w-3" /> {uploading ? '…' : 'Paste'}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={uploading}
              onClick={onUploadClick}
              className="!px-2.5 !py-1.5 !text-[10px] !font-bold"
            >
              <Upload className="h-3 w-3" /> {uploading ? '…' : 'Upload'}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.csv,.json,.jsonl,.xml,.yaml,.yml,.log,.html,.htm,.tsv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onFileChange(f);
              e.target.value = '';
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {uploadErr && <p className="mb-3 text-[11px] text-rose font-medium">{uploadErr}</p>}
        {docs.length === 0 ? (
          <p className="text-sm text-ink-soft">No documents in this room. Upload .txt / .md / .csv / .json.</p>
        ) : (
          <Accordion
            type="single"
            value={expandedDoc}
            onValueChange={v => setExpandedDoc(typeof v === 'string' ? v : '')}
          >
            {docs.map(doc => (
              <AccordionItem key={doc.id} value={doc.id}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`truncate ${doc.verified ? 'text-match' : ''}`}>{doc.name}</span>
                    <span className={`text-[10px] font-mono shrink-0 ${doc.verified ? 'text-match' : 'text-ink-muted'}`}>
                      {doc.verified ? 'Verified' : 'Pending'}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-xl bg-ink/5 border border-ink-faint/20 px-3 py-3 text-[11px] font-mono text-ink-soft space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span>Endpoint</span>
                      <span>{doc.endpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chunks</span>
                      <span>{doc.chunks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>
                  {!doc.verified && (
                    <Button
                      type="button"
                      variant="primary"
                      className="!text-[11px] !py-2 !px-3"
                      onClick={() => onToggleVerify(doc.id)}
                    >
                      Mark verified
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

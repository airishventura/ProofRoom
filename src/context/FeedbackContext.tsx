import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { Toast, ToastViewport, useToasts } from '../components/lib-ary/toast/Toast';

interface FeedbackCtx {
  /** Show a short toast. Never pass secrets or full clipboard payloads. */
  toast: (message: string) => void;
}

const Ctx = createContext<FeedbackCtx | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { toasts, add, remove } = useToasts();
  const toast = useCallback(
    (message: string) => {
      const msg = message.trim().slice(0, 200);
      if (!msg) return;
      add(msg);
    },
    [add]
  );

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <ToastViewport>
        {toasts.map(t => (
          <Toast key={t.id} id={t.id} message={t.message} onDismiss={remove} />
        ))}
      </ToastViewport>
    </Ctx.Provider>
  );
}

export function useFeedback(): FeedbackCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op outside provider (e.g. tests)
    return { toast: () => undefined };
  }
  return ctx;
}

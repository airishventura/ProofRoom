import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const X_PROFILE = 'https://x.com/airishventura';

type BrandMarkProps = {
  /** Visual scale for denser spots (login, public report). */
  size?: 'sm' | 'md';
  /** When false, title is not a home link (e.g. already inside a link). */
  linkHome?: boolean;
  className?: string;
  onNavigate?: () => void;
};

/**
 * ProofRoom wordmark + clickable “by Airish Ventura” credit (X).
 */
export function BrandMark({
  size = 'md',
  linkHome = true,
  className = '',
  onNavigate,
}: BrandMarkProps) {
  const iconBox =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : 'h-9 w-9 rounded-xl';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  const title = size === 'sm' ? 'text-lg' : 'text-xl';
  const credit = size === 'sm' ? 'text-[9px]' : 'text-[10px] sm:text-[11px]';

  const titleNode = (
    <span className={`font-display ${title} tracking-tight leading-none text-ink`}>
      Proof<span className="text-gold">Room</span>
    </span>
  );

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 ${className}`}>
      {linkHome ? (
        <Link
          to="/"
          onClick={onNavigate}
          className={`${iconBox} shrink-0 bg-gradient-to-br from-gold/20 to-match/20 border border-gold/15 flex items-center justify-center shadow-[0_0_20px_rgba(196,123,78,0.1)]`}
          aria-label="ProofRoom home"
        >
          <ShieldCheck className={`${icon} text-gold`} strokeWidth={2.5} />
        </Link>
      ) : (
        <div
          className={`${iconBox} shrink-0 bg-gradient-to-br from-gold/20 to-match/20 border border-gold/15 flex items-center justify-center shadow-[0_0_20px_rgba(196,123,78,0.1)]`}
        >
          <ShieldCheck className={`${icon} text-gold`} strokeWidth={2.5} />
        </div>
      )}

      <div className="flex flex-col justify-center min-w-0 gap-0.5">
        {linkHome ? (
          <Link
            to="/"
            onClick={onNavigate}
            className="hover:opacity-90 transition-opacity leading-none"
          >
            {titleNode}
          </Link>
        ) : (
          titleNode
        )}
        <a
          href={X_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          className={`${credit} font-medium tracking-[0.04em] text-ink-muted hover:text-gold transition-colors leading-none truncate`}
          title="Airish Ventura on X"
          onClick={e => e.stopPropagation()}
        >
          by <span className="underline decoration-gold/40 underline-offset-2">Airish Ventura</span>
        </a>
      </div>
    </div>
  );
}

export { X_PROFILE };

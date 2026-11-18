import { cn } from '../../lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-gradient-to-br from-[#8B94F0] via-[#6570DB] to-[#434CA8] shadow-[0_2px_10px_rgba(94,106,210,0.35)] ring-1 ring-white/10',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
        <path
          d="M6 18V6h2.95l6.1 7.9V6H18v12h-2.95l-6.1-7.9V18H6Z"
          fill="white"
          fillOpacity="0.96"
        />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-[15px] font-semibold tracking-[-0.015em] text-ink',
        className,
      )}
    >
      Nexora
    </span>
  );
}

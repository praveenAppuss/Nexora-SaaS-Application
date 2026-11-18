import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../store/useUiStore';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';
  const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className="icon-button h-8 w-8"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted transition hover:bg-zinc-500/10 hover:text-ink"
    >
      {isDark ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
      <span className="flex-1 text-left">{isDark ? 'Dark mode' : 'Light mode'}</span>
      <span
        className={cn(
          'relative h-[18px] w-[30px] shrink-0 rounded-full border transition-colors',
          isDark ? 'border-brand/50 bg-brand/60' : 'border-line-strong bg-zinc-400/30',
        )}
      >
        <motion.span
          initial={false}
          animate={{ left: isDark ? 15 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="absolute top-[2px] h-3 w-3 rounded-full bg-white shadow-sm"
        />
      </span>
    </button>
  );
}

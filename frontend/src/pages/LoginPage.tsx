import { motion } from 'framer-motion';
import {
  ArrowRight,
  Command,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { BrandMark, Wordmark } from '../components/ui/Brand';
import { Kbd } from '../components/ui/Kbd';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuthStore } from '../store/useAuthStore';

interface Feature {
  icon: ReactNode;
  title: string;
  copy: string;
}

const features: Feature[] = [
  {
    icon: <Zap className="h-3.5 w-3.5" />,
    title: 'Optimistic by default',
    copy: 'Drag work across five columns instantly — no spinners, no waiting.',
  },
  {
    icon: <Command className="h-3.5 w-3.5" />,
    title: 'Keyboard-first',
    copy: 'Jump to any issue, filter the board, or create work from the palette.',
  },
  {
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    title: 'Sprint clarity',
    copy: 'Story points, progress, and a full activity trail on every issue.',
  },
];

export default function LoginPage() {
  const demoLogin = useAuthStore((state) => state.demoLogin);
  const login = useAuthStore((state) => state.login);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<'demo' | 'email' | null>(null);

  const busy = isAuthenticating || pending !== null;

  const handleDemo = async () => {
    setPending('demo');
    clearError();
    await demoLogin();
    setPending(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending('email');
    clearError();
    await login(email, password);
    setPending(null);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-40 top-[-22%] h-[520px] w-[520px] rounded-full bg-brand/10 blur-[130px]" />
        <div className="absolute right-[-12%] top-[6%] h-[460px] w-[460px] rounded-full bg-violet-500/10 blur-[140px]" />
        <div className="absolute inset-0 bg-grid opacity-60" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2">
            <BrandMark />
            <Wordmark />
            <span className="ml-1.5 hidden rounded-md border border-line bg-surface px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-subtle sm:inline">
              Phase 1
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[10px] text-subtle sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Sandbox online
            </span>
            <ThemeToggle compact />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col lg:flex-row lg:items-center lg:gap-14 lg:px-10">
          <section className="hidden flex-1 flex-col justify-between self-stretch py-8 lg:flex">
            <div className="max-w-[460px] pt-6">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Sprint 14 in progress
                <span className="text-line-strong">·</span>
                <span className="text-subtle">12 issues</span>
              </div>
              <h1 className="font-display text-[42px] font-semibold leading-[1.03] tracking-[-0.035em] text-ink xl:text-[50px]">
                Where focused teams
                <br />
                                  <span className="bg-gradient-to-r from-[#4B55B8] via-[#5E6AD2] to-[#7C86E8] bg-clip-text text-transparent dark:from-[#AAB2FF] dark:via-[#8B94F0] dark:to-[#9EA7F5]">
                  ship the work.
                </span>
              </h1>
              <p className="mt-4 max-w-[400px] text-[14px] leading-relaxed text-muted">
                Nexora keeps sprints, issues, and decisions in one fast, keyboard-first
                workspace. No noise — just the next thing to ship.
              </p>

              <div className="mt-8 space-y-3">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-surface text-brand-soft">
                      {feature.icon}
                    </span>
                    <div>
                      <p className="text-[12px] font-medium text-ink">{feature.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-subtle">
                        {feature.copy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-5">
              <div className="flex items-center gap-2 text-[10px] text-subtle">
                <div className="flex -space-x-1.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[9px] font-semibold text-white ring-2 ring-bg">
                    AC
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-rose-600 text-[9px] font-semibold text-white ring-2 ring-bg">
                    PS
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-[9px] font-semibold text-white ring-2 ring-bg">
                    MJ
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-[9px] font-semibold text-white ring-2 ring-bg">
                    SR
                  </span>
                </div>
                7 engineers shipping together
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-subtle">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
                <span>opens the command palette</span>
              </div>
            </div>
          </section>

          <section className="flex w-full flex-1 items-center justify-center px-5 pb-10 pt-6 lg:max-w-[440px] lg:px-0 lg:pb-0 lg:pt-0">
            <div className="w-full max-w-[400px]">
              <div className="mb-6 lg:hidden">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-medium text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Sprint 14 in progress
                </div>
                <h1 className="font-display text-[28px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
                  Where focused teams{' '}
                  <span className="bg-gradient-to-r from-[#5E6AD2] to-[#7C86E8] bg-clip-text text-transparent dark:from-[#8B94F0] dark:to-[#AAB2FF]">
                    ship the work.
                  </span>
                </h1>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  A keyboard-first sprint workspace, ready in one click.
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel sm:p-6">
                <div className="mb-5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand dark:text-brand-soft">
                    Recruiter sandbox
                  </p>
                  <h2 className="mt-1.5 font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">
                    Welcome to Nexora
                  </h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">
                    Try the full workspace instantly, or sign in with the sandbox
                    credentials below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDemo()}
                  disabled={busy}
                  className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-brand/40 bg-brand/10 p-3 text-left transition hover:border-brand/60 hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_4px_16px_rgba(94,106,210,0.4)]">
                    {pending === 'demo' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">
                      One-Click Demo Login
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      Recruiter Sandbox · Sprint 14 pre-seeded
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-soft transition-transform group-hover:translate-x-0.5" />
                </button>

                <div className="flex items-center gap-3 py-4">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-subtle">
                    or sign in manually
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                  <div>
                    <label htmlFor="email" className="field-label">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (error) clearError();
                        }}
                        className="field h-10 pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="field-label">
                        Password
                      </label>
                      <span className="mb-1.5 text-[9px] text-subtle">
                        Sandbox: 6+ characters
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (error) clearError();
                        }}
                        className="field h-10 pl-9 pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-subtle transition hover:bg-zinc-500/10 hover:text-ink"
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] leading-relaxed text-red-600 dark:text-red-300"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button type="submit" disabled={busy} className="btn-primary h-10 w-full">
                    {pending === 'email' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Continue to workspace
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-4 text-center text-[9px] leading-relaxed text-subtle">
                  Sandbox authentication. No registration, no data leaves your browser.
                </p>
              </div>

              <p className="mt-4 text-center text-[10px] text-subtle">
                © 2026 Nexora · Nexora Core Engineering
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

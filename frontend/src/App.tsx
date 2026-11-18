import { useEffect } from 'react';
import { BrandMark } from './components/ui/Brand';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
import { useAuthStore } from './store/useAuthStore';

function BootSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg">
      <BrandMark className="h-10 w-10 rounded-xl" />
      <div className="flex items-center gap-2 text-[12px] text-subtle">
        <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-line-strong border-t-brand" />
        Opening workspace
      </div>
    </div>
  );
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!isInitialized) return <BootSplash />;

  return session ? <WorkspacePage /> : <LoginPage />;
}

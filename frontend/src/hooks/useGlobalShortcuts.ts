import { useEffect } from 'react';
import { useUiStore } from '../store/useUiStore';

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        useUiStore.getState().setCommandOpen(!useUiStore.getState().commandOpen);
        return;
      }

      if (event.key === 'Escape') {
        useUiStore.getState().setCommandOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

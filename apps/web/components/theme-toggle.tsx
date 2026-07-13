'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  // Sync from the attribute the no-flash script already set on <html>.
  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
    setTheme(next);
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Activar modo día' : 'Activar modo noche'}
      title={isDark ? 'Modo día' : 'Modo noche'}
      className="ring-focus fixed bottom-4 right-4 z-50 grid size-11 place-items-center rounded-full border border-[--color-border-hi] bg-[--color-surface]/70 text-[--color-fg] shadow-[var(--shadow-card)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[--color-gold] hover:text-[--color-gold] active:translate-y-0"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

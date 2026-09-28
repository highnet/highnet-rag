'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { COPY } from '@/content/copy';

const STORAGE_KEY = 'highnet-rag-theme';

// The theme lives on <html class="dark">; subscribe to it instead of copying it into state.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.classList.contains('dark');
const isDarkOnServer = () => false;

const ThemeToggle = () => {
  const dark = useSyncExternalStore(subscribe, isDark, isDarkOnServer);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  };

  const label = dark ? COPY.theme.toLight : COPY.theme.toDark;
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={toggle}>
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
};

// Runs before paint so the pad never flashes the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export { ThemeToggle, themeScript };

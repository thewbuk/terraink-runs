'use client';
import { Languages } from 'lucide-react';
import { LANGS, setLang } from '@/lib/lang';
import { useLang } from '@/lib/useLang';
import { cn } from '@/lib/utils';

export default function LangToggle({ className, full = false }: { className?: string; full?: boolean }) {
  const now = useLang();
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <Languages aria-hidden className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
      <select aria-label="Language" value={now} onChange={e => setLang(e.target.value)}
        className={cn('h-7 appearance-none rounded-md border border-input bg-transparent pr-2 pl-7 text-xs normal-case tracking-normal text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
          full && 'h-8 w-full text-sm')}>
        {Object.entries(LANGS).map(([k, l]) => <option key={k} value={k} lang={k} className="bg-background text-foreground">{full ? l.name : l.short}</option>)}
      </select>
    </label>
  );
}

'use client';
import { Languages } from 'lucide-react';
import { LANGS, setLang } from '@/lib/lang';
import { useLang } from '@/lib/useLang';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LangToggle({ className, full = false }: { className?: string; full?: boolean }) {
  const now = useLang();
  return (
    <Select value={now} onValueChange={setLang}>
      <SelectTrigger aria-label="Language" size={full ? 'default' : 'sm'}
        className={cn('justify-start normal-case tracking-normal [&>svg:last-child]:ml-auto', full ? 'w-full' : 'text-xs', className)}>
        <Languages aria-hidden className="size-3.5 text-muted-foreground" />
        <SelectValue>{full ? LANGS[now]?.name : LANGS[now]?.short}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align={full ? 'start' : 'end'}>
        {Object.entries(LANGS).map(([k, l]) => <SelectItem key={k} value={k} lang={k}>{l.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { lang } from '@/lib/lang';

const subscribe = (fn: () => void) => { addEventListener('garminlook:lang', fn); return () => removeEventListener('garminlook:lang', fn); };
export function useLang() {
  const l = useSyncExternalStore(subscribe, lang, () => 'en' as const);
  useEffect(() => { document.documentElement.lang = l; }, [l]);
  return l;
}

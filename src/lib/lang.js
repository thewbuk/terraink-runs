export const LANGS = { en: { name: 'English', short: 'EN', loc: 'en-GB' }, pl: { name: 'Polski', short: 'PL', loc: 'pl-PL' }, de: { name: 'Deutsch', short: 'DE', loc: 'de-DE' },
  es: { name: 'Español', short: 'ES', loc: 'es-ES' }, fr: { name: 'Français', short: 'FR', loc: 'fr-FR' }, it: { name: 'Italiano', short: 'IT', loc: 'it-IT' } };
const KEY = 'garminLook.lang';

/** @typedef {keyof typeof LANGS} Lang */
/** @returns {Lang | null} */
const known = l => (l && Object.hasOwn(LANGS, l) ? /** @type {Lang} */ (l) : null);
/** @returns {Lang} */
export function lang() {
  if (typeof window === 'undefined') return 'en';
  try { const l = known(localStorage.getItem(KEY)); if (l) return l; } catch { /* private mode */ }
  return known((navigator.language || '').slice(0, 2).toLowerCase()) || 'en';
}
export const loc = () => LANGS[lang()].loc;
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
  document.documentElement.lang = l;
  dispatchEvent(new Event('garminlook:lang')); dispatchEvent(new Event('garminlook:look'));
}
export const tr = dict => dict[lang()] ?? dict.en;
export const plural = (n, forms) => { const k = new Intl.PluralRules(loc()).select(n); return forms[k] ?? forms.other ?? forms.many; };

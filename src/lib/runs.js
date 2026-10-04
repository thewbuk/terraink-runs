/* Which run a page draws: the visitor's own (kept in sessionStorage) or the template's sample. */
import { open } from './fit';
import { build } from './build';
import { tr } from './lang';
import FILM from './samples/film.json';
import STORY from './samples/story.json';
import SQUARE from './samples/square.json';
import POSTER from './samples/poster.json';
import PRINT from './samples/print.json';

// made up by tools/mock.mts (pnpm mock)
const SAMPLES = { film: FILM, story: STORY, square: SQUARE, poster: POSTER, print: PRINT };

const KEY = 'garminLook.run', OPTS = 'garminLook.opts', WX = 'garminLook.weather';
const store = () => { try { return window.sessionStorage; } catch { return null; } };
const read = k => { try { return JSON.parse(store()?.getItem(k) || 'null'); } catch { return null; } };
const MESSAGES = {
  en: {
    'not-fit': 'That is not a FIT file. Export the original file from your watch app, or the .zip Garmin Connect gives you.',
    'no-gps': 'This activity has no GPS track, so there is no route to draw.',
    'bad-zip': 'Could not read that zip file.', 'no-fit-in-zip': 'There is no .fit file inside that zip.', 'bad-fit': 'That FIT file looks damaged.',
    other: 'Could not read that file.',
  },
  pl: {
    'not-fit': 'To nie jest plik FIT. Wyeksportuj oryginalny plik z aplikacji zegarka albo plik .zip z Garmin Connect.',
    'no-gps': 'Ta aktywność nie ma śladu GPS, więc nie ma czego narysować.',
    'bad-zip': 'Nie udało się odczytać pliku zip.', 'no-fit-in-zip': 'W tym pliku zip nie ma pliku .fit.', 'bad-fit': 'Ten plik FIT wygląda na uszkodzony.',
    other: 'Nie udało się odczytać pliku.',
  },
  de: {
    'not-fit': 'Das ist keine FIT-Datei. Exportiere die Originaldatei aus der App deiner Uhr oder die .zip aus Garmin Connect.',
    'no-gps': 'Diese Aktivität hat keine GPS-Spur, es gibt also keine Strecke zu zeichnen.',
    'bad-zip': 'Die Zip-Datei konnte nicht gelesen werden.', 'no-fit-in-zip': 'In dieser Zip-Datei ist keine .fit-Datei.', 'bad-fit': 'Diese FIT-Datei scheint beschädigt zu sein.',
    other: 'Die Datei konnte nicht gelesen werden.',
  },
  es: {
    'not-fit': 'Eso no es un archivo FIT. Exporta el archivo original desde la app de tu reloj, o el .zip de Garmin Connect.',
    'no-gps': 'Esta actividad no tiene ruta GPS, así que no hay nada que dibujar.',
    'bad-zip': 'No se pudo leer ese archivo zip.', 'no-fit-in-zip': 'No hay ningún archivo .fit dentro de ese zip.', 'bad-fit': 'Ese archivo FIT parece dañado.',
    other: 'No se pudo leer ese archivo.',
  },
  fr: {
    'not-fit': 'Ce n’est pas un fichier FIT. Exportez le fichier d’origine depuis l’appli de votre montre, ou le .zip de Garmin Connect.',
    'no-gps': 'Cette activité n’a pas de trace GPS, il n’y a donc pas de parcours à dessiner.',
    'bad-zip': 'Impossible de lire ce fichier zip.', 'no-fit-in-zip': 'Ce zip ne contient aucun fichier .fit.', 'bad-fit': 'Ce fichier FIT semble endommagé.',
    other: 'Impossible de lire ce fichier.',
  },
  it: {
    'not-fit': 'Questo non è un file FIT. Esporta il file originale dall’app dell’orologio, o lo .zip di Garmin Connect.',
    'no-gps': 'Questa attività non ha una traccia GPS, quindi non c’è un percorso da disegnare.',
    'bad-zip': 'Impossibile leggere questo file zip.', 'no-fit-in-zip': 'In questo zip non c’è nessun file .fit.', 'bad-fit': 'Questo file FIT sembra danneggiato.',
    other: 'Impossibile leggere questo file.',
  },
};

export const isSample = () => !read(KEY);
export const sample = (template = 'film') => structuredClone(SAMPLES[template] || FILM);
export const opts = () => read(OPTS) || {};
export const setOpts = o => store()?.setItem(OPTS, JSON.stringify(o));
export const weather = () => read(WX);
export function setWeather(w) { store()?.setItem(WX, JSON.stringify(w)); dispatchEvent(new Event('garminlook:look')); }
export function current(template) {
  const mine = read(KEY), run = mine || sample(template), w = weather();
  if (mine) { const o = opts(); if (o.name) mine.meta.name = o.name; if (o.place) mine.meta.place = o.place; }
  if (w) run.meta.weather = { ...run.meta.weather, ...w };
  return run;
}
export async function load(file) { const run = build(await open(await file.arrayBuffer())); store()?.setItem(KEY, JSON.stringify(run)); return run; }
export function clear() { store()?.removeItem(KEY); store()?.removeItem(OPTS); store()?.removeItem(WX); }
export const message = err => { const m = tr(MESSAGES); return m[err && err.message] || m.other; };
/** @param {{ button?: HTMLElement | null, signal?: AbortSignal, onError?: (msg: string) => void, onLoad?: () => void }} [o] */
export function attach({ button, signal, onError = msg => alert(msg), onLoad = () => location.reload() } = {}) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.fit,.zip' });
  const take = async file => { if (!file) return; try { await load(file); onLoad(); } catch (e) { console.warn(e); onError(message(e)); } };
  input.addEventListener('change', () => take(input.files[0]));
  if (button) button.addEventListener('click', () => { input.value = ''; input.click(); }, { signal });
  addEventListener('dragover', e => e.preventDefault(), { signal });
  addEventListener('drop', e => { e.preventDefault(); take(e.dataTransfer.files[0]); }, { signal });
  return { pick: () => { input.value = ''; input.click(); } };
}

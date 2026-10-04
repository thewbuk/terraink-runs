'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import * as Runs from '@/lib/runs';
import * as Kit from '@/lib/kit';
import { lang } from '@/lib/lang';
import { Mark } from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import { useLang } from '@/lib/useLang';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import Live from '@/components/Live';
import type { Template } from '@/components/Player';
// imported (not /public) so each preview gets a hashed URL and stale caches can't serve an old one
import filmLight from '@/assets/previews/film-light.webp';
import filmDark from '@/assets/previews/film-dark.webp';
import storyLight from '@/assets/previews/story-light.webp';
import storyDark from '@/assets/previews/story-dark.webp';
import squareLight from '@/assets/previews/square-light.webp';
import squareDark from '@/assets/previews/square-dark.webp';
import posterLight from '@/assets/previews/poster-light.webp';
import posterDark from '@/assets/previews/poster-dark.webp';
import printLight from '@/assets/previews/print-light.webp';
import printDark from '@/assets/previews/print-dark.webp';

type Summary = { mine: boolean; name: string; title: string; line: string; route: string; profile: string; stats: [string, string | number, string][] };

// how each card sizes its template, and where a moving one starts
const CARD: Record<Template, { box: string; stage?: string; at?: number }> = {
  film: { box: 'aspect-video w-full', at: 27600 },
  story: { box: 'aspect-[9/16] h-full', at: 12700 },
  square: { box: 'aspect-square h-full', at: 10700 },
  poster: { box: 'aspect-[4/5] h-full', stage: '[&_svg]:!h-full [&_svg]:!w-full' },
  print: { box: 'aspect-[3/4] h-full', stage: '[&_svg]:!h-full [&_svg]:!w-full' },
};

const IMG = { film: { light: filmLight, dark: filmDark }, story: { light: storyLight, dark: storyDark }, square: { light: squareLight, dark: squareDark },
  poster: { light: posterLight, dark: posterDark }, print: { light: printLight, dark: printDark } };
const tpl = (href: Template, name: string, format: string, text: string, make: string, open: string) => ({ href: `/${href}`, name, format, img: IMG[href], text, make, open });

const TEXT = {
  en: {
    dropTitle: 'Drop your run', dropSub: 'a .fit file, or the .zip from Garmin Connect', maps: 'Maps', runs: 'Runs',
    h1: 'Turn a run into a film.', lede: 'Drop the FIT file your watch recorded. The route, the pace, the heart rate and the climbing become a film you can export.',
    choose: 'Choose a .fit file', watch: 'Watch the sample', orDrop: 'or drop it anywhere', where: 'where’s my file?',
    connect: ['Open the run on ', ''], gear: ['Gear icon, then ', 'Export File'], dropZip: 'Drop the .zip on this page, as it is',
    other: 'Other watches: any app that exports the original .fit. It needs GPS, so a treadmill run won’t work.',
    watchAria: 'Watch the film of the sample run', heroAlt: 'A film of a run: the route in heart-rate colours, with distance, time and heart rate',
    yourRun: 'Your run', step1: 'Step 1 · Your run is loaded', back: 'Back to the sample', started: (t: string) => `started ${t}`,
    optional: 'Optional: your watch doesn’t record a title or a place. Anything you type here goes on every template and is kept as you type.',
    title: 'Title', place: 'Place', placeEg: 'e.g. Katowice', next: 'Next: pick a template',
    step2: 'Step 2', pick: 'Now pick what to make', five: 'Five templates', pickSub: 'Every preview below is drawn from your run. Open one to play it, change its look and export it.',
    cardAlt: (n: string) => `${n} template`,
    stats: { distance: 'Distance', time: 'Time', pace: 'Pace', climb: 'Climb', avgHr: 'Avg heart rate', maxHr: 'Max heart rate', cadence: 'Cadence', spm: 'spm', energy: 'Energy' },
    templates: [
      tpl('film', 'Film', '60 s · 16:9 · MP4', 'The route draws itself, the run replays on the clock, then the climbing, heart rate, splits and the finish time.', 'Make a film of your run', 'Open film'),
      tpl('story', 'Story', '22 s · 9:16 · MP4', 'For a phone: the route, one big number, five figures, the time.', 'Make a story of your run', 'Open story'),
      tpl('square', 'Square', '17 s · 1:1 · MP4', 'For the feed: the replay beside the distance, the ground filling in below, every split as a bar.', 'Make a square of your run', 'Open square'),
      tpl('poster', 'Poster', '4:5 · PNG', 'One image on paper: the route, the elevation, six figures, time in zones.', 'Make a poster of your run', 'Open poster'),
      tpl('print', 'Print', '3:4 · PNG', 'For the wall: the route large and alone, in a glowing line, zone colours or ink on paper.', 'Make a print of your run', 'Open print'),
    ],
  },
  pl: {
    dropTitle: 'Upuść swój bieg', dropSub: 'plik .fit albo .zip z Garmin Connect', maps: 'Mapy', runs: 'Biegi',
    h1: 'Zamień bieg w film.', lede: 'Upuść plik FIT nagrany przez zegarek. Trasa, tempo, tętno i podbiegi zmienią się w film, który możesz wyeksportować.',
    choose: 'Wybierz plik .fit', watch: 'Zobacz przykład', orDrop: 'albo upuść go gdziekolwiek', where: 'gdzie jest mój plik?',
    connect: ['Otwórz bieg w ', ''], gear: ['Ikona zębatki, potem ', 'Eksportuj plik'], dropZip: 'Upuść plik .zip na tę stronę, tak jak jest',
    other: 'Inne zegarki: każda aplikacja, która eksportuje oryginalny plik .fit. Potrzebny jest GPS, więc bieg na bieżni nie zadziała.',
    watchAria: 'Obejrzyj film z przykładowego biegu', heroAlt: 'Film z biegu: trasa w kolorach stref tętna, z dystansem, czasem i tętnem',
    yourRun: 'Twój bieg', step1: 'Krok 1 · Bieg wczytany', back: 'Wróć do przykładu', started: (t: string) => `start ${t}`,
    optional: 'Opcjonalnie: zegarek nie zapisuje tytułu ani miejsca. To, co tu wpiszesz, pojawi się na każdym szablonie i zapisuje się na bieżąco.',
    title: 'Tytuł', place: 'Miejsce', placeEg: 'np. Katowice', next: 'Dalej: wybierz szablon',
    step2: 'Krok 2', pick: 'Teraz wybierz, co zrobić', five: 'Pięć szablonów', pickSub: 'Każdy podgląd poniżej jest narysowany z Twojego biegu. Otwórz jeden, żeby go odtworzyć, zmienić wygląd i wyeksportować.',
    cardAlt: (n: string) => `Szablon ${n}`,
    stats: { distance: 'Dystans', time: 'Czas', pace: 'Tempo', climb: 'Podbiegi', avgHr: 'Średnie tętno', maxHr: 'Tętno maks.', cadence: 'Kadencja', spm: 'kr./min', energy: 'Energia' },
    templates: [
      tpl('film', 'Film', '60 s · 16:9 · MP4', 'Trasa rysuje się sama, bieg odtwarza się na zegarze, potem podbiegi, tętno, odcinki i czas na mecie.', 'Zrób film ze swojego biegu', 'Otwórz film'),
      tpl('story', 'Story', '22 s · 9:16 · MP4', 'Na telefon: trasa, jedna duża liczba, pięć wartości, czas.', 'Zrób story ze swojego biegu', 'Otwórz story'),
      tpl('square', 'Kwadrat', '17 s · 1:1 · MP4', 'Do feedu: odtworzenie obok dystansu, profil terenu wypełnia się na dole, każdy odcinek jako słupek.', 'Zrób kwadrat ze swojego biegu', 'Otwórz kwadrat'),
      tpl('poster', 'Plakat', '4:5 · PNG', 'Jeden obraz na papierze: trasa, profil wysokości, sześć wartości, czas w strefach.', 'Zrób plakat ze swojego biegu', 'Otwórz plakat'),
      tpl('print', 'Wydruk', '3:4 · PNG', 'Na ścianę: sama trasa w dużym formacie, świecącą linią, w kolorach stref albo tuszem na papierze.', 'Zrób wydruk ze swojego biegu', 'Otwórz wydruk'),
    ],
  },
  de: {
    dropTitle: 'Lauf hier ablegen', dropSub: 'eine .fit-Datei oder die .zip aus Garmin Connect', maps: 'Karten', runs: 'Läufe',
    h1: 'Mach aus deinem Lauf einen Film.', lede: 'Leg die FIT-Datei deiner Uhr hier ab. Strecke, Pace, Herzfrequenz und Höhenmeter werden zu einem Film, den du exportieren kannst.',
    choose: '.fit-Datei wählen', watch: 'Beispiel ansehen', orDrop: 'oder irgendwo ablegen', where: 'wo ist meine Datei?',
    connect: ['Öffne den Lauf in ', ''], gear: ['Zahnrad, dann ', 'Datei exportieren'], dropZip: 'Leg die .zip unverändert auf dieser Seite ab',
    other: 'Andere Uhren: jede App, die die originale .fit exportiert. GPS ist nötig, ein Laufbandlauf geht also nicht.',
    watchAria: 'Film des Beispiellaufs ansehen', heroAlt: 'Ein Film eines Laufs: die Strecke in Herzfrequenzfarben, mit Distanz, Zeit und Herzfrequenz',
    yourRun: 'Dein Lauf', step1: 'Schritt 1 · Dein Lauf ist geladen', back: 'Zurück zum Beispiel', started: (t: string) => `Start ${t}`,
    optional: 'Optional: Deine Uhr speichert weder Titel noch Ort. Was du hier eingibst, erscheint auf jeder Vorlage und wird sofort gespeichert.',
    title: 'Titel', place: 'Ort', placeEg: 'z. B. München', next: 'Weiter: Vorlage wählen',
    step2: 'Schritt 2', pick: 'Jetzt wählen, was entstehen soll', five: 'Fünf Vorlagen', pickSub: 'Jede Vorschau unten ist aus deinem Lauf gezeichnet. Öffne eine, um sie abzuspielen, das Aussehen zu ändern und zu exportieren.',
    cardAlt: (n: string) => `Vorlage ${n}`,
    stats: { distance: 'Distanz', time: 'Zeit', pace: 'Pace', climb: 'Anstieg', avgHr: 'Ø Herzfrequenz', maxHr: 'Max. Herzfrequenz', cadence: 'Kadenz', spm: 'spm', energy: 'Energie' },
    templates: [
      tpl('film', 'Film', '60 s · 16:9 · MP4', 'Die Strecke zeichnet sich selbst, der Lauf läuft auf der Uhr ab, dann Anstiege, Herzfrequenz, Splits und Zielzeit.', 'Film aus deinem Lauf machen', 'Film öffnen'),
      tpl('story', 'Story', '22 s · 9:16 · MP4', 'Fürs Handy: die Strecke, eine große Zahl, fünf Werte, die Zeit.', 'Story aus deinem Lauf machen', 'Story öffnen'),
      tpl('square', 'Quadrat', '17 s · 1:1 · MP4', 'Für den Feed: die Wiedergabe neben der Distanz, darunter füllt sich das Profil, jeder Split als Balken.', 'Quadrat aus deinem Lauf machen', 'Quadrat öffnen'),
      tpl('poster', 'Poster', '4:5 · PNG', 'Ein Bild auf Papier: die Strecke, das Höhenprofil, sechs Werte, Zeit in den Zonen.', 'Poster aus deinem Lauf machen', 'Poster öffnen'),
      tpl('print', 'Druck', '3:4 · PNG', 'Für die Wand: die Strecke groß und allein, als leuchtende Linie, in Zonenfarben oder als Tinte auf Papier.', 'Druck aus deinem Lauf machen', 'Druck öffnen'),
    ],
  },
  es: {
    dropTitle: 'Suelta tu carrera', dropSub: 'un archivo .fit o el .zip de Garmin Connect', maps: 'Mapas', runs: 'Carreras',
    h1: 'Convierte una carrera en una película.', lede: 'Suelta el archivo FIT que grabó tu reloj. La ruta, el ritmo, la frecuencia cardiaca y el desnivel se convierten en una película que puedes exportar.',
    choose: 'Elegir un archivo .fit', watch: 'Ver el ejemplo', orDrop: 'o suéltalo en cualquier parte', where: '¿dónde está mi archivo?',
    connect: ['Abre la carrera en ', ''], gear: ['Icono de engranaje, luego ', 'Exportar archivo'], dropZip: 'Suelta el .zip en esta página, tal cual',
    other: 'Otros relojes: cualquier app que exporte el .fit original. Necesita GPS, así que una carrera en cinta no sirve.',
    watchAria: 'Ver la película de la carrera de ejemplo', heroAlt: 'Una película de una carrera: la ruta en colores de frecuencia cardiaca, con distancia, tiempo y pulso',
    yourRun: 'Tu carrera', step1: 'Paso 1 · Tu carrera está cargada', back: 'Volver al ejemplo', started: (t: string) => `salida ${t}`,
    optional: 'Opcional: tu reloj no guarda un título ni un lugar. Lo que escribas aquí aparece en todas las plantillas y se guarda al escribir.',
    title: 'Título', place: 'Lugar', placeEg: 'p. ej. Madrid', next: 'Siguiente: elige una plantilla',
    step2: 'Paso 2', pick: 'Ahora elige qué crear', five: 'Cinco plantillas', pickSub: 'Cada vista previa está dibujada con tu carrera. Abre una para reproducirla, cambiar su aspecto y exportarla.',
    cardAlt: (n: string) => `Plantilla ${n}`,
    stats: { distance: 'Distancia', time: 'Tiempo', pace: 'Ritmo', climb: 'Desnivel', avgHr: 'FC media', maxHr: 'FC máxima', cadence: 'Cadencia', spm: 'pasos/min', energy: 'Energía' },
    templates: [
      tpl('film', 'Película', '60 s · 16:9 · MP4', 'La ruta se dibuja sola, la carrera se reproduce con el reloj y luego el desnivel, el pulso, los parciales y el tiempo final.', 'Haz una película de tu carrera', 'Abrir película'),
      tpl('story', 'Story', '22 s · 9:16 · MP4', 'Para el móvil: la ruta, un número grande, cinco datos y el tiempo.', 'Haz una story de tu carrera', 'Abrir story'),
      tpl('square', 'Cuadrado', '17 s · 1:1 · MP4', 'Para el feed: la repetición junto a la distancia, el perfil llenándose abajo y cada parcial como una barra.', 'Haz un cuadrado de tu carrera', 'Abrir cuadrado'),
      tpl('poster', 'Póster', '4:5 · PNG', 'Una imagen en papel: la ruta, el perfil, seis datos y el tiempo en zonas.', 'Haz un póster de tu carrera', 'Abrir póster'),
      tpl('print', 'Lámina', '3:4 · PNG', 'Para la pared: la ruta grande y sola, en una línea luminosa, con colores de zona o tinta sobre papel.', 'Haz una lámina de tu carrera', 'Abrir lámina'),
    ],
  },
  fr: {
    dropTitle: 'Déposez votre course', dropSub: 'un fichier .fit, ou le .zip de Garmin Connect', maps: 'Cartes', runs: 'Courses',
    h1: 'Faites de votre course un film.', lede: 'Déposez le fichier FIT enregistré par votre montre. Le parcours, l’allure, la fréquence cardiaque et le dénivelé deviennent un film à exporter.',
    choose: 'Choisir un fichier .fit', watch: 'Voir l’exemple', orDrop: 'ou déposez-le n’importe où', where: 'où est mon fichier ?',
    connect: ['Ouvrez la course dans ', ''], gear: ['Icône engrenage, puis ', 'Exporter le fichier'], dropZip: 'Déposez le .zip sur cette page, tel quel',
    other: 'Autres montres : toute appli qui exporte le .fit d’origine. Il faut le GPS, donc une course sur tapis ne marchera pas.',
    watchAria: 'Voir le film de la course d’exemple', heroAlt: 'Le film d’une course : le parcours aux couleurs de la fréquence cardiaque, avec distance, temps et pouls',
    yourRun: 'Votre course', step1: 'Étape 1 · Votre course est chargée', back: 'Revenir à l’exemple', started: (t: string) => `départ ${t}`,
    optional: 'Facultatif : votre montre n’enregistre ni titre ni lieu. Ce que vous tapez ici apparaît sur chaque modèle et s’enregistre au fur et à mesure.',
    title: 'Titre', place: 'Lieu', placeEg: 'ex. Lyon', next: 'Suivant : choisir un modèle',
    step2: 'Étape 2', pick: 'Choisissez maintenant quoi créer', five: 'Cinq modèles', pickSub: 'Chaque aperçu ci-dessous est dessiné à partir de votre course. Ouvrez-en un pour le lire, changer son style et l’exporter.',
    cardAlt: (n: string) => `Modèle ${n}`,
    stats: { distance: 'Distance', time: 'Temps', pace: 'Allure', climb: 'Dénivelé', avgHr: 'FC moyenne', maxHr: 'FC max', cadence: 'Cadence', spm: 'pas/min', energy: 'Énergie' },
    templates: [
      tpl('film', 'Film', '60 s · 16:9 · MP4', 'Le parcours se dessine, la course se rejoue sur l’horloge, puis le dénivelé, le cœur, les intermédiaires et le temps final.', 'Faire un film de votre course', 'Ouvrir le film'),
      tpl('story', 'Story', '22 s · 9:16 · MP4', 'Pour le téléphone : le parcours, un grand chiffre, cinq valeurs, le temps.', 'Faire une story de votre course', 'Ouvrir la story'),
      tpl('square', 'Carré', '17 s · 1:1 · MP4', 'Pour le fil : la course rejouée à côté de la distance, le profil qui se remplit dessous, chaque intermédiaire en barre.', 'Faire un carré de votre course', 'Ouvrir le carré'),
      tpl('poster', 'Affiche', '4:5 · PNG', 'Une image sur papier : le parcours, le profil, six valeurs, le temps par zone.', 'Faire une affiche de votre course', 'Ouvrir l’affiche'),
      tpl('print', 'Tirage', '3:4 · PNG', 'Pour le mur : le parcours seul et en grand, en ligne lumineuse, aux couleurs des zones ou à l’encre sur papier.', 'Faire un tirage de votre course', 'Ouvrir le tirage'),
    ],
  },
  it: {
    dropTitle: 'Trascina qui la tua corsa', dropSub: 'un file .fit, o lo .zip di Garmin Connect', maps: 'Mappe', runs: 'Corse',
    h1: 'Trasforma una corsa in un film.', lede: 'Trascina il file FIT registrato dal tuo orologio. Il percorso, il passo, la frequenza cardiaca e il dislivello diventano un film da esportare.',
    choose: 'Scegli un file .fit', watch: 'Guarda l’esempio', orDrop: 'o trascinalo ovunque', where: 'dov’è il mio file?',
    connect: ['Apri la corsa su ', ''], gear: ['Icona ingranaggio, poi ', 'Esporta file'], dropZip: 'Trascina lo .zip su questa pagina, così com’è',
    other: 'Altri orologi: qualsiasi app che esporti il .fit originale. Serve il GPS, quindi una corsa sul tapis roulant non funziona.',
    watchAria: 'Guarda il film della corsa di esempio', heroAlt: 'Il film di una corsa: il percorso nei colori della frequenza cardiaca, con distanza, tempo e battito',
    yourRun: 'La tua corsa', step1: 'Passo 1 · La tua corsa è caricata', back: 'Torna all’esempio', started: (t: string) => `partenza ${t}`,
    optional: 'Facoltativo: l’orologio non registra un titolo né un luogo. Quello che scrivi qui compare su ogni modello e si salva mentre scrivi.',
    title: 'Titolo', place: 'Luogo', placeEg: 'es. Milano', next: 'Avanti: scegli un modello',
    step2: 'Passo 2', pick: 'Ora scegli cosa creare', five: 'Cinque modelli', pickSub: 'Ogni anteprima qui sotto è disegnata dalla tua corsa. Aprine una per riprodurla, cambiarne lo stile ed esportarla.',
    cardAlt: (n: string) => `Modello ${n}`,
    stats: { distance: 'Distanza', time: 'Tempo', pace: 'Passo', climb: 'Dislivello', avgHr: 'FC media', maxHr: 'FC massima', cadence: 'Cadenza', spm: 'passi/min', energy: 'Energia' },
    templates: [
      tpl('film', 'Film', '60 s · 16:9 · MP4', 'Il percorso si disegna da solo, la corsa si rivive sull’orologio, poi dislivello, cuore, parziali e tempo finale.', 'Fai un film della tua corsa', 'Apri il film'),
      tpl('story', 'Storia', '22 s · 9:16 · MP4', 'Per il telefono: il percorso, un numero grande, cinque valori, il tempo.', 'Fai una storia della tua corsa', 'Apri la storia'),
      tpl('square', 'Quadrato', '17 s · 1:1 · MP4', 'Per il feed: la corsa accanto alla distanza, il profilo che si riempie sotto, ogni parziale come una barra.', 'Fai un quadrato della tua corsa', 'Apri il quadrato'),
      tpl('poster', 'Poster', '4:5 · PNG', 'Un’immagine su carta: il percorso, l’altimetria, sei valori, il tempo nelle zone.', 'Fai un poster della tua corsa', 'Apri il poster'),
      tpl('print', 'Stampa', '3:4 · PNG', 'Per la parete: il percorso grande e da solo, in una linea luminosa, nei colori delle zone o inchiostro su carta.', 'Fai una stampa della tua corsa', 'Apri la stampa'),
    ],
  },
};
type Words = typeof TEXT.en;

const Key = ({ children }: { children: React.ReactNode }) => <kbd className="rounded border bg-muted px-1.5 py-px font-sans text-[12px] text-foreground">{children}</kbd>;
const steps = (X: Words) => [
  <>{X.connect[0]}<a href="https://connect.garmin.com/modern/activities" target="_blank" rel="noreferrer" className="text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground">Garmin Connect</a></>,
  <>{X.gear[0]}<Key>{X.gear[1]}</Key></>,
  <>{X.dropZip}</>,
];

function summarise(sample = false): Summary {
  const S = TEXT[lang()].stats, RUN = sample ? Runs.sample() : Runs.current(), M = RUN.meta, F = Kit.fmt(RUN), W = Kit.words(RUN, F);
  const T = RUN.track, span = Math.max(M.maxAlt - M.minAlt, 8);
  const stats = ([
    [S.distance, F.dec(M.distance / F.U), F.DU], [S.time, F.hms(M.elapsed), ''], [S.pace, F.pace(M.elapsed / (M.distance / F.U)), `/${F.DU}`],
    [S.climb, F.int(F.ht(M.gain)), F.HU], M.hasHr && [S.avgHr, M.avgHr, W.BPM], M.hasHr && [S.maxHr, M.maxHr, W.BPM],
    M.cadence && [S.cadence, M.cadence, S.spm], M.calories && [S.energy, F.int(M.calories), 'kcal'],
  ] as ([string, string | number, string] | false | null)[]).filter(s => !!s) as [string, string | number, string][];
  return { mine: !sample && !Runs.isSample(), name: W.NAME, title: W.TITLE, line: [F.DATE, TEXT[lang()].started(F.clock(0)), W.SPORT].join(' · '), stats,
    route: Kit.poly(T.x.map((x: number, i: number) => [x, T.y[i]])),
    profile: Kit.poly(T.d.map((d: number, i: number) => [d / M.distance * 400, 44 - (T.a[i] - M.minAlt) / span * 40])) };
}

function Route({ d, stroke, width }: { d: string; stroke: string; width: number }) {
  return <svg viewBox="-40 -40 1080 1080" className="h-full w-full" aria-hidden><path d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

const FRESH = 'garminLook.fresh';

// Links here don't prefetch: through the terraink.space rewrite (multi-zones) Next's segment prefetches come back 404
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal';

export default function Landing() {
  const L = useLang(), X = TEXT[L], STEPS = steps(X);
  const [run, setRun] = useState<Summary>(() => summarise(true));
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const [opts, setOpts] = useState({ name: '', place: '' });
  const pick = useRef<() => void>(() => {});

  useEffect(() => {
    const ac = new AbortController();
    // sessionStorage is client-only, so the visitor's run is read after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRun(summarise()); setOpts({ name: '', place: '', ...Runs.opts() });
    // after a file loads the page reloads; FRESH says to take the visitor straight to the templates
    pick.current = Runs.attach({ signal: ac.signal, onError: setError, onLoad: () => { sessionStorage.setItem(FRESH, '1'); location.reload(); } }).pick;
    if (sessionStorage.getItem(FRESH)) {
      sessionStorage.removeItem(FRESH);
      requestAnimationFrame(() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    addEventListener('dragover', () => setOver(true), { signal: ac.signal });
    addEventListener('dragleave', e => { if (!e.relatedTarget) setOver(false); }, { signal: ac.signal });
    addEventListener('drop', () => setOver(false), { signal: ac.signal });
    return () => ac.abort();
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRun(summarise()); }, [L]);

  const keep = (o: typeof opts) => { setOpts(o); Runs.setOpts({ name: o.name.trim(), place: o.place.trim() }); setRun(summarise()); };

  return (
    <div className="min-h-full">
      <div aria-hidden className={`pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed border-signal bg-ink/85 backdrop-blur-sm transition-opacity duration-200 ${over ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center">
          <p className="text-4xl font-semibold tracking-tight">{X.dropTitle}</p>
          <p className="mt-2 text-soft">{X.dropSub}</p>
        </div>
      </div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
        {/* the landing and /maps are a different zone, so plain <a> rather than <Link> */}
        <a href="https://terraink.space/" className={`flex items-center gap-2.5 font-semibold tracking-tight ${focus}`}>
          <Mark className="h-6 w-9" /> <span>Terra<span className="text-signal">Ink</span> <span className="font-normal text-soft">Runs</span></span>
        </a>
        {/* same nav as terraink.space: Maps, Runs, then the shared theme toggle */}
        <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-soft">
          <a href="https://terraink.space/maps" className={`transition-colors hover:text-paper ${focus}`}>{X.maps}</a>
          <Link href="/" prefetch={false} aria-current="page" className={`text-paper ${focus}`}>{X.runs}</Link>
          <LangToggle />
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="grid items-center gap-10 pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-20">
          <div>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl">{X.h1}</h1>
            <p className="mt-5 max-w-md text-lg text-soft text-pretty">{X.lede}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button size="lg" onClick={() => pick.current()} className="h-12 rounded-full px-6 text-base font-semibold transition-transform hover:-translate-y-0.5">{X.choose}</Button>
              <Link href="/film" prefetch={false} className={`font-medium text-paper underline decoration-line underline-offset-4 hover:decoration-signal ${focus}`}>{X.watch} →</Link>
            </div>
            <Collapsible className="group mt-4 max-w-md">
              <p className="text-sm text-soft">
                {X.orDrop} ·{' '}
                <CollapsibleTrigger className={`inline-flex items-center gap-1 rounded text-foreground/80 underline decoration-muted-foreground/60 underline-offset-4 hover:text-foreground hover:decoration-foreground ${focus}`}>
                  {X.where}<ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                </CollapsibleTrigger>
              </p>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <ol className="mt-3 space-y-1.5 border-l pl-4 text-sm text-foreground/85">
                  {STEPS.map((s, k) => (
                    <li key={k} className="flex gap-2.5"><span className="w-3 flex-none text-muted-foreground tabular-nums">{k + 1}</span><span>{s}</span></li>
                  ))}
                </ol>
                <p className="mt-2.5 pl-4 text-xs text-muted-foreground">{X.other}</p>
              </CollapsibleContent>
            </Collapsible>
            <p role="alert" className="mt-3 min-h-6 text-alert">{error}</p>
          </div>
          <Link href="/film" prefetch={false} aria-label={X.watchAria} className={`group relative block overflow-hidden rounded-xl ring-1 ring-line ${focus}`}>
            <div className="transition-transform duration-500 group-hover:scale-[1.015] motion-safe:animate-[rise_.9s_cubic-bezier(.16,1,.3,1)_both]">
              <Live template="film" priority className="aspect-video" still={{ light: filmLight, dark: filmDark }} alt={X.heroAlt} />
            </div>
          </Link>
        </section>

        {run.mine && (
          <section aria-label={X.yourRun} className="mt-14 rounded-2xl border bg-card p-6 motion-safe:animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_both]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="h-24 w-24 flex-none"><Route d={run.route} stroke="var(--moss)" width={24} /></div>
              <div className="min-w-[13rem] flex-1">
                <p className="text-xs font-medium uppercase tracking-[.16em] text-moss">{X.step1}</p>
                <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{run.title}</p>
                <p className="text-sm text-soft">{run.line}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { Runs.clear(); setRun(summarise()); setOpts({ name: '', place: '' }); }}>{X.back}</Button>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-4">
              {run.stats.map(([label, value, unit]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-[.14em] text-soft">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}{unit && <span className="ml-1 text-sm font-normal text-soft">{unit}</span>}</dd>
                </div>
              ))}
            </dl>
            <svg viewBox="0 0 400 46" preserveAspectRatio="none" className="mt-5 h-12 w-full" aria-hidden>
              <path d={`${run.profile} L400 46 L0 46 Z`} className="fill-moss/15" />
              <path d={run.profile} fill="none" className="stroke-moss" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="mt-5 border-t pt-5">
              <p className="text-sm text-soft">{X.optional}</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                {(['name', 'place'] as const).map(k => (
                  <label key={k} className="flex flex-col gap-1.5 text-xs uppercase tracking-widest text-soft">
                    {k === 'name' ? X.title : X.place}
                    <input type="text" name={k} maxLength={40} value={opts[k]} placeholder={k === 'name' ? run.name : X.placeEg} onChange={e => keep({ ...opts, [k]: e.target.value })}
                      className={`w-56 rounded-lg border border-line bg-ink px-3 py-2.5 text-base normal-case tracking-normal text-paper ${focus}`} />
                  </label>
                ))}
                <Button size="lg" onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="h-[46px] rounded-lg px-5 font-semibold sm:ml-auto">{X.next} ↓</Button>
              </div>
            </div>
          </section>
        )}

        <div id="templates" className="mb-5 mt-16 scroll-mt-8">
          {run.mine && <p className="text-xs font-medium uppercase tracking-[.16em] text-moss">{X.step2}</p>}
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{run.mine ? X.pick : X.five}</h2>
          {run.mine && <p className="mt-1.5 text-soft">{X.pickSub}</p>}
        </div>
        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-6">
          {X.templates.map(t => { const id = t.href.slice(1) as Template; return (
            <Link key={t.href} href={t.href} prefetch={false} className={`group flex flex-col ${focus} rounded-xl ${t.format.includes('PNG') ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
              <div className="flex h-72 items-center justify-center rounded-xl bg-peat p-5 ring-1 ring-line transition group-hover:ring-signal">
                {/* keyed on mine: a loaded run shows no sample stills */}
                <Live key={String(run.mine)} template={id} at={CARD[id].at} still={run.mine ? undefined : t.img} alt={X.cardAlt(t.name)}
                  className={`${CARD[id].box} max-h-full max-w-full overflow-hidden rounded-md shadow-2xl`} stage={CARD[id].stage} />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <b className="text-xl font-semibold tracking-tight">{t.name}</b>
                <span className="text-sm text-soft">{t.format}</span>
              </div>
              <p className="mt-1.5 text-[15px] text-soft text-pretty">{t.text}</p>
              <span className="mt-auto pt-3 font-semibold text-signal">{run.mine ? t.make : t.open} →</span>
            </Link>
          ); })}
        </div>

      </main>
    </div>
  );
}

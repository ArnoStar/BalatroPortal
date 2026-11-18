// The portal in the player's language: English, and Russian (ru.ts). The
// choice is the site's: the game's settings keep it (language.ts), so the
// portal, the casino and the game speak the same one; the browser's language
// is the first choice.
//
// Text is written in English where it is shown, through these functions
// (usable anywhere, in components or not):
//   t('Your runs')                      a sentence
//   t('Hello, {name}', { name })        with values
//   tp(n, '# run', '# runs')            a number and its word (# is the number)
//   tx('Read {link}', { link: <a/> })   a sentence with elements in it
// Each language maps the English text to its own (messages/ru.ts; English is
// the fallback); `npm run i18n` lists what a language lacks. A change of
// language remounts the pages (`children` keyed by it): every text is read
// again.
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { load_game_text, type GameText } from '@/shared/api/game-text'; // (not the index: shared/api's problem details use this module)
import { browser_languages, on_language_change, store_language, stored_language } from './language';
import { ru } from './messages/ru';

export type Lang = 'en' | 'ru';

export interface Language {
  code: Lang;
  /** its own name */
  name: string;
  /** the game's key for it (its settings, its localization file) */
  game: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', game: 'en-us' },
  { code: 'ru', name: 'Русский', game: 'ru' },
];

/** a language's text for the English one: a sentence, or a word's plural forms (as Intl.PluralRules names them) */
export type Dictionary = Record<string, string | Partial<Record<Intl.LDMLPluralRule, string>>>;

const DICTIONARIES: Record<Lang, Dictionary> = { en: {}, ru };

function ours(key: string | null): Lang | null {
  if (!key) return null;
  const k = key.toLowerCase();
  return LANGUAGES.find((l) => l.game === k || l.code === k || l.code === k.split(/[-_]/)[0])?.code ?? null;
}

function initial(): Lang {
  const chosen = ours(stored_language());
  if (chosen) return chosen;
  for (const tag of browser_languages()) {
    const l = ours(tag);
    if (l) return l;
  }
  return 'en';
}

let lang: Lang = initial();
let rules = new Intl.PluralRules(lang);
let game_text: GameText | null = null;

const fill = (text: string, vars?: Record<string, string | number>) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

/** a sentence in the player's language (English when it has none) */
export function t(text: string, vars?: Record<string, string | number>): string {
  const own = DICTIONARIES[lang][text];
  return fill(typeof own === 'string' ? own : text, vars);
}

/** a text to translate later, through a variable (a table of them): N_('Flush') marks it for `npm run i18n` */
export const N_ = (text: string) => text;

/** a number and its word: tp(3, '# run', '# runs') → "3 runs" ("3 забега"); `#` is the number, formatted */
export function tp(n: number, one: string, other: string, vars?: Record<string, string | number>): string {
  const own = DICTIONARIES[lang][other];
  const shown = number_format().format(n);
  let form: string;
  if (own && typeof own === 'object') {
    const rule = rules.select(n);
    form = own[rule] ?? own.other ?? own.many ?? other;
  } else {
    form = n === 1 ? one : other;
  }
  return fill(form.replace(/#/g, shown), vars);
}

/** a sentence with elements in it: tx('Read {link}', { link: <a href="...">the rules</a> }) */
export function tx(text: string, parts: Record<string, ReactNode>): ReactNode {
  const own = DICTIONARIES[lang][text];
  const s = typeof own === 'string' ? own : text;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of s.matchAll(/\{(\w+)\}/g)) {
    out.push(s.slice(last, m.index));
    out.push(<Fragment key={`${m[1]}-${m.index}`}>{m[1] in parts ? parts[m[1]] : m[0]}</Fragment>);
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(s.slice(last));
  return <>{out}</>;
}

/** the game's name in the player's language for a card, deck, stake, tag or voucher key (`fallback`: its English one) */
export function game_name(key: string, fallback: string): string {
  return game_text?.names[key] ?? fallback;
}

/** a poker hand's name ("Flush") in the player's language */
export const hand_name = (hand: string) => game_text?.hands[hand] ?? hand;

/** a playing card's rank and suit in the game's words (their English names: Ace, Spades) */
export const rank_name = (rank: string) => game_text?.ranks[rank] ?? rank;
export const suit_name = (suit: string) => game_text?.suits[suit] ?? suit;
/** a challenge's name in the player's language */
export const challenge_name = (id: string, fallback: string) => game_text?.challenges[id] ?? fallback;

/** the current language */
export const current_lang = () => lang;
export const locale = () => lang;

let numbers: Intl.NumberFormat | null = null;
function number_format() {
  numbers ??= new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
  return numbers;
}

function set_current(l: Lang) {
  lang = l;
  rules = new Intl.PluralRules(l);
  numbers = null;
  document.documentElement.lang = l;
}

interface I18nValue {
  lang: Lang;
  set_lang: (l: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/** the language: `children` are mounted again in a new one (every text is read again) */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ lang: Lang; ready: boolean }>(() => ({ lang, ready: lang === 'en' }));

  useEffect(() => {
    let live = true;
    set_current(state.lang);
    if (state.lang === 'en') {
      game_text = null;
      if (!state.ready) setState({ lang: state.lang, ready: true });
      return;
    }
    const game = LANGUAGES.find((l) => l.code === state.lang)?.game ?? state.lang;
    void load_game_text(game).then((text) => {
      if (!live) return;
      game_text = text;
      setState((s) => (s.lang === state.lang ? { ...s, ready: true } : s));
    });
    return () => {
      live = false;
    };
  }, [state.lang, state.ready]);

  // (the casino, the game or another tab changed it)
  useEffect(() => on_language_change(() => {
    const l = initial();
    if (l !== lang) setState({ lang: l, ready: false });
  }), []);

  const set_lang = useCallback((l: Lang) => {
    store_language(LANGUAGES.find((x) => x.code === l)?.game ?? l);
    setState({ lang: l, ready: l === 'en' });
  }, []);

  set_current(state.lang);
  const value = useMemo(() => ({ lang: state.lang, set_lang }), [state.lang, set_lang]);
  // (until the game's names are there, the page waits: a moment, the first time)
  return <I18nContext.Provider value={value}>{state.ready ? <Fragment key={state.lang}>{children}</Fragment> : null}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n outside I18nProvider');
  return value;
}

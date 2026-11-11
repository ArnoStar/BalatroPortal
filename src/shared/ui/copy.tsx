import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './icons';

/** text with a button that copies it (a seed, an id) */
export function CopyText({ text, label, children }: { text: string; label: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* no clipboard (an insecure origin): the text is there to select */
    }
  }

  return (
    <button type="button" className={`copy${copied ? ' copy--done' : ''}`} onClick={copy} aria-label={`${label}: ${text}. Copy`}>
      <span className="copy__text">{children ?? text}</span>
      <Icon name={copied ? 'check' : 'copy'} />
      <span className="visually-hidden" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  );
}

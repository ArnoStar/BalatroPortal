import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '@/shared/i18n';
import { Icon } from './icons';

/** a dialog over the page, open while it is shown; Escape, the close button or `onClose` closes it */
export function Modal({ title, onClose, children, wide = false, className }: {
  title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className={['modal', wide && 'modal--wide', className].filter(Boolean).join(' ')} onClose={onClose}>
      <header className="modal__head">
        <h2 className="modal__title">{title}</h2>
        <button type="button" className="icon-button" aria-label={t('Close')} onClick={() => ref.current?.close()}>
          <Icon name="close" />
        </button>
      </header>
      <div className="modal__body">{children}</div>
    </dialog>
  );
}

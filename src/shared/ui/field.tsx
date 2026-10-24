import { useId, type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint ? (
        <small id={`${id}-hint`} className="field__hint">
          {hint}
        </small>
      ) : null}
    </div>
  );
}

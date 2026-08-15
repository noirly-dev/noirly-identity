import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  tone?: "canvas" | "panel";
};

const labelClass =
  "font-mono text-[11px] font-semibold tracking-[0.18em] uppercase";
const controlClass =
  "border-0 border-b border-dashed bg-transparent px-0 py-2 text-base outline-none";

function toneClasses(onPanel: boolean) {
  return onPanel
    ? "border-panel-ink/40 text-panel-ink placeholder:text-panel-ink/35 focus:border-panel-ink"
    : "border-ink/40 text-ink placeholder:text-ink/35 focus:border-ink";
}

export function Field({
  label,
  tone = "panel",
  id,
  className = "",
  ...props
}: FieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const onPanel = tone === "panel";

  return (
    <label className="flex flex-col gap-2" htmlFor={fieldId}>
      <span className={`${labelClass} ${onPanel ? "text-panel-ink/55" : "text-muted"}`}>
        {label}
      </span>
      <input
        id={fieldId}
        className={`${controlClass} ${toneClasses(onPanel)} ${className}`}
        {...props}
      />
    </label>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  tone?: "canvas" | "panel";
};

export function TextArea({
  label,
  tone = "panel",
  id,
  className = "",
  ...props
}: TextAreaProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const onPanel = tone === "panel";

  return (
    <label className="flex flex-col gap-2" htmlFor={fieldId}>
      <span className={`${labelClass} ${onPanel ? "text-panel-ink/55" : "text-muted"}`}>
        {label}
      </span>
      <textarea
        id={fieldId}
        className={`${controlClass} min-h-28 resize-y ${toneClasses(onPanel)} ${className}`}
        {...props}
      />
    </label>
  );
}

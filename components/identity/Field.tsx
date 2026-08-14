import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  tone?: "canvas" | "panel";
};

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
      <span
        className={`font-mono text-[11px] font-semibold tracking-[0.18em] uppercase ${
          onPanel ? "text-panel-ink/55" : "text-muted"
        }`}
      >
        {label}
      </span>
      <input
        id={fieldId}
        className={`border-0 border-b border-dashed bg-transparent px-0 py-2 text-base outline-none ${
          onPanel
            ? "border-panel-ink/40 text-panel-ink placeholder:text-panel-ink/35 focus:border-panel-ink"
            : "border-ink/40 text-ink placeholder:text-ink/35 focus:border-ink"
        } ${className}`}
        {...props}
      />
    </label>
  );
}

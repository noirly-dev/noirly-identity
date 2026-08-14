type VerticalLabelProps = {
  children: string;
};

export function VerticalLabel({ children }: VerticalLabelProps) {
  return (
    <div className="pointer-events-none hidden w-10 shrink-0 items-center justify-center border-r border-dashed border-hairline lg:flex">
      <span className="font-mono text-[10px] font-medium tracking-[0.28em] uppercase [writing-mode:vertical-rl] rotate-180">
        {children}
      </span>
    </div>
  );
}

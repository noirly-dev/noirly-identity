/** Skeleton for login / register / other auth shells. */
export default function AuthLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-16 animate-pulse sm:px-6">
      <div className="mx-auto h-14 w-14 rounded-[var(--r-md)] bg-[var(--surface-2)]" />
      <div className="mx-auto h-3 w-32 rounded bg-[var(--surface-2)]" />
      <div className="mx-auto h-8 w-52 max-w-full rounded bg-[var(--surface-2)]" />
      <div className="mt-2 space-y-3 rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--surface)] p-6">
        <div className="h-10 rounded-[var(--r-md)] bg-[var(--surface-2)]" />
        <div className="h-10 rounded-[var(--r-md)] bg-[var(--surface-2)]" />
        <div className="h-11 rounded-[var(--r-md)] bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}

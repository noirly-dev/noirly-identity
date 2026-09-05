import { ThemeControls } from "@/components/ThemeControls";

/** Signed-in surfaces (account, clients) share the same corner chrome as auth. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeControls size="sm" />
      </div>
      {children}
    </div>
  );
}

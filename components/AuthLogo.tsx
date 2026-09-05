import { BrandMark } from "@/components/BrandMark";

/** Shared AuthShell logo so every auth surface matches Ledger. */
export function AuthLogo() {
  return <BrandMark className="h-14 w-14 brand-mark--on-surface" />;
}

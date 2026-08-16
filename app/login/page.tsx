import { redirect } from "next/navigation";
import { LoginPageClient } from "@/app/login/LoginForm";
import { withDb } from "@/lib/api/with-db";
import { getCurrentUser } from "@/lib/auth/auth-service";
import { isPopupLogin, sanitizeReturnTo } from "@/lib/auth/return-to";
import { getEnv } from "@/lib/config/env";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    return_to?: string;
    popup?: string;
    select_account?: string;
  }>;
}) {
  const params = await searchParams;
  const selectAccount = params.select_account === "1";
  const user = await withDb(async () => {
    const token = await getSessionTokenFromCookies();
    return getCurrentUser(token);
  });

  if (user && !selectAccount) {
    redirect(
      sanitizeReturnTo(params.return_to, getEnv().APP_URL) ?? "/account",
    );
  }

  return (
    <LoginPageClient
      popup={isPopupLogin(params.popup)}
      currentEmail={user?.email ?? null}
      selectAccount={selectAccount}
    />
  );
}

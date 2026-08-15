import { redirect } from "next/navigation";
import { LoginPageClient } from "@/app/login/LoginForm";
import { withDb } from "@/lib/api/with-db";
import { getCurrentUser } from "@/lib/auth/auth-service";
import { isPopupLogin, sanitizeReturnTo } from "@/lib/auth/return-to";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; popup?: string }>;
}) {
  const params = await searchParams;
  const user = await withDb(async () => {
    const token = await getSessionTokenFromCookies();
    return getCurrentUser(token);
  });

  if (user) {
    redirect(sanitizeReturnTo(params.return_to) ?? "/account");
  }

  return <LoginPageClient popup={isPopupLogin(params.popup)} />;
}

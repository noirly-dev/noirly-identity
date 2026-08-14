import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/identity/AccountSettings";
import { withDb } from "@/lib/api/with-db";
import { getCurrentUser } from "@/lib/auth/auth-service";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";

export default async function AccountPage() {
  const user = await withDb(async () => {
    const token = await getSessionTokenFromCookies();
    return getCurrentUser(token);
  });

  if (!user) {
    redirect("/login?return_to=/account");
  }

  return <AccountSettings initialUser={user} />;
}

import { redirect } from "next/navigation";
import { ClientGenerator } from "@/components/ClientGenerator";
import { withDb } from "@/lib/api/with-db";
import { getCurrentUser } from "@/lib/auth/auth-service";
import { getEnv } from "@/lib/config/env";
import { listOAuthClients } from "@/lib/oauth/client-admin";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";

export default async function ClientsPage() {
  const { user, clients } = await withDb(async () => {
    const token = await getSessionTokenFromCookies();
    const current = await getCurrentUser(token);
    if (!current) {
      return { user: null, clients: [] };
    }
    if (!current.roles.includes("admin")) {
      return { user: current, clients: [] };
    }
    return { user: current, clients: await listOAuthClients() };
  });

  if (!user) {
    redirect("/login?return_to=/clients");
  }
  if (!user.roles.includes("admin")) {
    redirect("/account");
  }

  return <ClientGenerator issuer={getEnv().OIDC_ISSUER} initialClients={clients} />;
}

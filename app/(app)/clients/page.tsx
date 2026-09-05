import { redirect } from "next/navigation";
import { ClientGenerator } from "@/components/ClientGenerator";
import { withDb } from "@/lib/api/with-db";
import { getRequestUser } from "@/lib/auth/request-user";
import { getEnv } from "@/lib/config/env";
import { listOAuthClients } from "@/lib/oauth/client-admin";

export default async function ClientsPage() {
  const user = await getRequestUser();

  if (!user) {
    redirect("/login?return_to=/clients");
  }
  if (!user.roles.includes("admin")) {
    redirect("/account");
  }

  const clients = await withDb(() => listOAuthClients());

  return <ClientGenerator issuer={getEnv().OIDC_ISSUER} initialClients={clients} />;
}

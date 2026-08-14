export function redactSecretInUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("token")) {
      parsed.searchParams.set("token", "[REDACTED]");
    }
    return parsed.toString();
  } catch {
    return url.replace(/([?&]token=)[^&]+/gi, "$1[REDACTED]");
  }
}

export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) {
    return "***";
  }
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function buildVerificationEmail(input: {
  name: string;
  verifyUrl: string;
  expiresInHours: number;
}): { subject: string; text: string; html: string } {
  const subject = "Verify your Noirly account";
  const text = [
    `Hi ${input.name},`,
    "",
    "Thanks for creating your Noirly account.",
    "",
    "Please verify your email address to continue using Noirly.",
    "",
    `Verify my email: ${input.verifyUrl}`,
    "",
    `This verification link will expire in ${input.expiresInHours} hours.`,
    "",
    "If you didn't create a Noirly account, you can safely ignore this email.",
    "",
    "Thanks,",
    "The Noirly Team",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #18181b;">
      <p>Hi ${escapeHtml(input.name)},</p>
      <p>Thanks for creating your Noirly account.</p>
      <p>Please verify your email address to continue using Noirly.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(input.verifyUrl)}"
           style="background:#18181b;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px;display:inline-block;">
          Verify my email
        </a>
      </p>
      <p>This verification link will expire in ${input.expiresInHours} hours.</p>
      <p>If you didn't create a Noirly account, you can safely ignore this email.</p>
      <p>Thanks,<br/>The Noirly Team</p>
    </div>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

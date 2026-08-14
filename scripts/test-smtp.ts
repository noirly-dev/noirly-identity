import { config } from "dotenv";
import { resolve } from "node:path";
import nodemailer from "nodemailer";

// Force .env.local values so a stale shell EMAIL_PROVIDER=development cannot mask SMTP.
config({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const provider = process.env.EMAIL_PROVIDER;

  console.log("EMAIL_PROVIDER:", provider);
  console.log("SMTP_HOST:", host);
  console.log("SMTP_PORT:", port);
  console.log("SMTP_SECURE:", secure);
  console.log("SMTP_USER:", user);
  console.log("EMAIL_FROM:", from);
  console.log("SMTP_PASS set:", Boolean(pass));

  if (provider !== "smtp") {
    throw new Error("EMAIL_PROVIDER is not smtp");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  await transporter.verify();
  console.log("SMTP verify: OK");

  const to = process.argv[2] || user;
  if (!to) {
    throw new Error("No recipient provided");
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Noirly Identity SMTP test",
    text: "If you received this, GoDaddy SMTP is working with Nodemailer.",
  });

  console.log("SMTP send: OK");
  console.log("messageId:", info.messageId);
  console.log("accepted:", info.accepted);
  console.log("rejected:", info.rejected);
  console.log("response:", info.response);
}

main().catch((error) => {
  console.error("SMTP test failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

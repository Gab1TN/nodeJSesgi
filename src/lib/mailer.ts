import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.MAIL_FROM || "onboarding@resend.dev";
const appUrl = process.env.APP_URL || "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendVerificationEmail(to: string, token: string): Promise<string | null> {
  const link = `${appUrl}/api/users/verify?token=${token}`;

  if (!resend) {
    console.log(`[mailer:dev] verification link for ${to} -> ${link}`);
    return link;
  }

  await resend.emails.send({
    from,
    to,
    subject: "Verifiez votre email",
    html: `<p>Cliquez pour valider votre compte : <a href="${link}">${link}</a></p>`,
  });

  return null;
}

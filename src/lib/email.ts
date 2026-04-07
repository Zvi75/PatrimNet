import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendInvitationEmail(data: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  token: string;
}): Promise<void> {
  const joinUrl = `${APP_URL}/join?token=${data.token}`;

  await resend.emails.send({
    from: "PatrimNet <noreply@patrimnet.fr>",
    to: data.to,
    subject: `Invitation à rejoindre ${data.workspaceName} sur PatrimNet`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 0;">
        <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: #1e293b; padding: 28px 32px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 22px; font-weight: 700; color: white;">PatrimNet</span>
          </div>
          <!-- Body -->
          <div style="padding: 32px;">
            <h2 style="margin: 0 0 8px; font-size: 20px; color: #0f172a;">Vous avez été invité(e)</h2>
            <p style="margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.5;">
              <strong>${data.inviterName}</strong> vous invite à rejoindre le workspace
              <strong>${data.workspaceName}</strong> en tant que <strong>${data.role}</strong>.
            </p>
            <a href="${joinUrl}"
               style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Rejoindre le workspace
            </a>
            <p style="margin: 24px 0 0; color: #94a3b8; font-size: 13px;">
              Ou copiez ce lien : <a href="${joinUrl}" style="color: #2563eb;">${joinUrl}</a>
            </p>
            <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px;">
              Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendLeaseExpiryAlert(data: {
  to: string;
  assetName: string;
  tenantName: string;
  expiryDate: string;
  daysRemaining: number;
}): Promise<void> {
  await resend.emails.send({
    from: "PatrimNet <alertes@patrimnet.fr>",
    to: data.to,
    subject: `Alerte échéance — ${data.assetName} expire dans ${data.daysRemaining} jours`,
    html: `
      <p>Le bail de <strong>${data.tenantName}</strong> sur l'actif <strong>${data.assetName}</strong>
      expire le <strong>${data.expiryDate}</strong> (dans ${data.daysRemaining} jours).</p>
      <p><a href="${APP_URL}/leases">Accéder aux baux →</a></p>
    `,
  });
}

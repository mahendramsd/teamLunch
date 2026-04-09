import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: false, // TLS via STARTTLS
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'), // Gmail App Password
      },
    });
  }

  async sendInvite(params: {
    to: string;
    sessionTitle: string;
    sessionId: number;
    inviterName: string;
  }): Promise<void> {
    const { to, sessionTitle, sessionId, inviterName } = params;

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const apiUrl = this.config.get<string>(
      'API_URL',
      'http://localhost:3001',
    );
    const redirectAfterLogin = `${frontendUrl}/sessions/${sessionId}`;
    const loginLink = `${apiUrl}/auth/google?redirect=${encodeURIComponent(redirectAfterLogin)}`;

    const subject = `You're invited to join "${sessionTitle}" on TeamLunch 🍽️`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>TeamLunch Invite</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:40px 48px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">🍽️ TeamLunch</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Collaborative lunch decision maker</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1f2937;">
                You've been invited!
              </h2>
              <p style="margin:0 0 24px;font-size:16px;color:#4b5563;line-height:1.6;">
                <strong>${inviterName}</strong> has invited you to join a TeamLunch session:
              </p>

              <!-- Session Card -->
              <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:10px;padding:24px;margin-bottom:32px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Session</p>
                <h3 style="margin:0;font-size:24px;font-weight:800;color:#111827;">${sessionTitle}</h3>
              </div>

              <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.6;">
                Click the button below to sign in with your Google account and join the session. Once inside, you can suggest restaurants and vote on where the team should go!
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:8px;padding:0;">
                    <a href="${loginLink}"
                       style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.01em;">
                      Sign in &amp; Join Session →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${loginLink}" style="color:#2563eb;word-break:break-all;">${loginLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 48px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                TeamLunch · Making lunch decisions fun &amp; fair<br/>
                If you weren't expecting this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: `"TeamLunch" <${this.config.get<string>('MAIL_USER')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Invite email sent to ${to} for session #${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send invite email to ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}

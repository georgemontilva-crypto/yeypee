import { Resend } from "resend";
import { cfg } from "../config";

const resend = cfg.resendApiKey ? new Resend(cfg.resendApiKey) : null;

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!resend) {
    console.log(`[email][dev] To: ${to} | Subject: ${subject}`);
    return true;
  }
  try {
    await resend.emails.send({
      from: cfg.mailFrom,
      to: [to],
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Resend error:", err);
    return false;
  }
}

export function verificationEmail(token: string, appName = "YEYPEE"): string {
  const url = `${cfg.appUrl}/api/auth/verify/${token}`;
  return `
  <div style="font-family: Poppins, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; letter-spacing: 0.08em;">${appName}</h1>
    <h2 style="font-size: 18px;">Confirm your email</h2>
    <p style="color: #4A4A4A; line-height: 1.6;">
      Welcome to ${appName}! Please confirm your email address by clicking the button below.
    </p>
    <a href="${url}" style="display:inline-block; background:#0F0F0F; color:#fff; padding: 14px 28px; border-radius: 999px; text-decoration:none; font-weight:700; font-size: 12px; letter-spacing: 0.12em;">
      CONFIRM EMAIL
    </a>
    <p style="color: #999; font-size: 13px; margin-top: 24px;">
      If the button doesn't work, paste this link into your browser:<br/>${url}
    </p>
  </div>`;
}

export function welcomeClubEmail(name: string): string {
  return `
  <div style="font-family: Poppins, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; letter-spacing: 0.08em;">YEYPEE</h1>
    <h2 style="font-size: 18px;">Welcome to the YEYPEE Club!</h2>
    <p style="color: #4A4A4A; line-height: 1.6;">
      Thanks for joining, ${name || "collector"}! You'll now receive special updates,
      collector tips, and early access to new drops.
    </p>
    <p style="color: #4A4A4A; line-height: 1.6;">Collect. Discover. Trade.</p>
  </div>`;
}

export function shippingEmail(orderNumber: string, tracking?: string | null, carrier?: string | null): string {
  const trackingText =
    tracking && carrier
      ? `<p style="color: #4A4A4A;">Tracking: <strong>${carrier} ${tracking}</strong></p>`
      : "";
  return `
  <div style="font-family: Poppins, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; letter-spacing: 0.08em;">YEYPEE</h1>
    <h2 style="font-size: 18px;">Your order ${orderNumber} has shipped!</h2>
    ${trackingText}
    <p style="color: #4A4A4A; line-height: 1.6;">Thank you for shopping with YEYPEE.</p>
  </div>`;
}

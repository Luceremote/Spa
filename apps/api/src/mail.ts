// Wrapper de email. Si no hay RESEND_API_KEY, hace no-op y loguea (modo dev).
import { Resend } from "resend";
import { env } from "./env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendMail(args: SendArgs): Promise<void> {
  if (!resend || !env.MAIL_FROM) {
    console.log("[mail:noop] (resend/mail_from sin configurar)", args.subject, "→", args.to);
    return;
  }
  try {
    // Resend SDK v4: NO arroja en error, retorna { data, error }
    const result = await resend.emails.send({
      from: env.MAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    if (result.error) {
      console.error("[mail] Resend rechazó:", JSON.stringify(result.error), "subject=", args.subject, "to=", args.to);
    } else {
      console.log("[mail] enviado id=", result.data?.id, "to=", args.to, "subject=", args.subject);
    }
  } catch (e) {
    // Nunca dejes que un fallo de email tumbe la transacción de negocio
    console.error("[mail] excepción enviando:", e);
  }
}

// Helper para escapar HTML user-provided antes de inyectar en templates
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface BookingMailData {
  spaName: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  serviceName: string;
  startAtISO: string;
  priceCents: number;
  bookingId: string;
  paymentUrl?: string;
}

function money(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("es-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
}

const BTN = `display:inline-block;padding:12px 24px;background:#d63384;color:#fff;text-decoration:none;border-radius:8px;font-weight:600`;
const BOX = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;line-height:1.5`;

export function bookingConfirmationEmail(d: BookingMailData): { subject: string; html: string } {
  return {
    subject: `Reserva recibida — ${d.spaName}`,
    html: `<div style="${BOX}">
      <h2 style="color:#d63384;margin:0 0 12px">¡Recibimos tu reserva!</h2>
      <p>Hola <strong>${esc(d.customerName)}</strong>, tu reserva está registrada.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fafafa;border-radius:8px">
        <tr><td style="padding:10px 14px;color:#666">Servicio</td><td style="padding:10px 14px"><strong>${esc(d.serviceName)}</strong></td></tr>
        <tr><td style="padding:10px 14px;color:#666">Fecha</td><td style="padding:10px 14px"><strong>${esc(fmtDate(d.startAtISO))}</strong></td></tr>
        <tr><td style="padding:10px 14px;color:#666">Total</td><td style="padding:10px 14px"><strong>${money(d.priceCents)}</strong></td></tr>
        <tr><td style="padding:10px 14px;color:#666">Referencia</td><td style="padding:10px 14px"><code>${esc(d.bookingId)}</code></td></tr>
      </table>
      ${d.paymentUrl
        ? `<p style="text-align:center;margin:24px 0">
            <a href="${esc(d.paymentUrl)}" style="${BTN}">Pagar ahora</a>
          </p>`
        : ""}
      <p style="color:#666;font-size:14px">Si necesitas modificarla, contáctanos.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;text-align:center">${esc(d.spaName)}</p>
    </div>`,
  };
}

export function bookingPaidEmail(d: BookingMailData): { subject: string; html: string } {
  return {
    subject: `Pago confirmado — ${d.spaName}`,
    html: `<div style="${BOX}">
      <h2 style="color:#16a34a;margin:0 0 12px">✓ Pago confirmado</h2>
      <p>Hola <strong>${esc(d.customerName)}</strong>, recibimos tu pago. Tu reserva está confirmada.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fafafa;border-radius:8px">
        <tr><td style="padding:10px 14px;color:#666">Servicio</td><td style="padding:10px 14px"><strong>${esc(d.serviceName)}</strong></td></tr>
        <tr><td style="padding:10px 14px;color:#666">Cuándo</td><td style="padding:10px 14px"><strong>${esc(fmtDate(d.startAtISO))}</strong></td></tr>
        <tr><td style="padding:10px 14px;color:#666">Pagado</td><td style="padding:10px 14px"><strong>${money(d.priceCents)}</strong></td></tr>
      </table>
      <p style="color:#666;font-size:14px">¡Te esperamos!</p>
    </div>`,
  };
}

interface GiftCardMailData {
  spaName: string;
  recipientName: string;
  recipientEmail: string;
  purchaserName: string;
  amountCents: number;
  code: string;
  message?: string | null;
  appUrl: string;
}

export function giftCardEmail(d: GiftCardMailData): { subject: string; html: string } {
  return {
    subject: `🎁 Tienes una Gift Card de ${d.spaName}`,
    html: `<div style="${BOX}">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px">🎁</div>
        <h2 style="color:#d63384;margin:8px 0">${esc(d.purchaserName)} te regaló una Gift Card</h2>
      </div>
      <p style="font-size:16px">Hola <strong>${esc(d.recipientName)}</strong>,</p>
      <p style="font-size:16px">Tienes un regalo de <strong>${esc(d.spaName)}</strong> con saldo para usar en cualquier servicio.</p>
      ${d.message
        ? `<div style="background:#fff5f8;border-left:4px solid #d63384;padding:16px;margin:20px 0;border-radius:4px">
            <p style="margin:0;font-style:italic;color:#555">"${esc(d.message)}"</p>
            <p style="margin:8px 0 0;font-size:13px;color:#999">— ${esc(d.purchaserName)}</p>
          </div>`
        : ""}
      <div style="background:linear-gradient(135deg,#d63384,#f06292);color:#fff;padding:32px;border-radius:12px;text-align:center;margin:24px 0">
        <div style="font-size:14px;opacity:0.9;text-transform:uppercase;letter-spacing:2px">Valor</div>
        <div style="font-size:42px;font-weight:bold;margin:8px 0">${money(d.amountCents)}</div>
        <div style="background:#fff;color:#333;padding:14px;border-radius:8px;margin-top:16px;font-family:monospace;font-size:18px;letter-spacing:3px;font-weight:bold">${esc(d.code)}</div>
        <div style="font-size:12px;opacity:0.9;margin-top:8px">Código de canje</div>
      </div>
      <p style="text-align:center;margin:28px 0">
        <a href="${esc(d.appUrl)}/reservar" style="${BTN}">Reservar ahora</a>
      </p>
      <p style="color:#666;font-size:13px;text-align:center">Usa el código al confirmar tu reserva para aplicar el saldo.</p>
    </div>`,
  };
}

export function giftCardReceiptEmail(d: GiftCardMailData): { subject: string; html: string } {
  return {
    subject: `Recibo: Gift Card de ${money(d.amountCents)} — ${d.spaName}`,
    html: `<div style="${BOX}">
      <h2 style="color:#16a34a">✓ Gift Card enviada</h2>
      <p>Hola <strong>${esc(d.purchaserName)}</strong>, tu compra fue procesada con éxito.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fafafa;border-radius:8px">
        <tr><td style="padding:10px 14px;color:#666">Para</td><td style="padding:10px 14px"><strong>${esc(d.recipientName)}</strong> (${esc(d.recipientEmail)})</td></tr>
        <tr><td style="padding:10px 14px;color:#666">Valor</td><td style="padding:10px 14px"><strong>${money(d.amountCents)}</strong></td></tr>
        <tr><td style="padding:10px 14px;color:#666">Código</td><td style="padding:10px 14px"><code>${esc(d.code)}</code></td></tr>
      </table>
      <p style="color:#666;font-size:14px">El destinatario recibió un correo separado con el código y las instrucciones para canjearlo.</p>
    </div>`,
  };
}

export function newBookingAdminEmail(d: BookingMailData): { subject: string; html: string } {
  return {
    subject: `Nueva reserva: ${d.serviceName} — ${d.customerName}`,
    html: `<div style="${BOX}">
      <h2>Nueva reserva</h2>
      <p><strong>${esc(d.customerName)}</strong> reservó <strong>${esc(d.serviceName)}</strong>.</p>
      <ul>
        <li>Cuándo: <strong>${esc(fmtDate(d.startAtISO))}</strong></li>
        <li>Teléfono: <a href="https://wa.me/${esc(d.customerPhone.replace(/\D/g, ""))}">${esc(d.customerPhone)}</a></li>
        ${d.customerEmail ? `<li>Email: ${esc(d.customerEmail)}</li>` : ""}
        <li>Total: <strong>${money(d.priceCents)}</strong></li>
        <li>Ref: <code>${esc(d.bookingId)}</code></li>
      </ul>
    </div>`,
  };
}

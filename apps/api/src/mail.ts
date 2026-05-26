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
    console.log("[mail:noop]", args.subject, "→", args.to);
    return;
  }
  try {
    await resend.emails.send({
      from: env.MAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
  } catch (e) {
    // Nunca dejes que un fallo de email tumbe la transacción de negocio
    console.error("[mail] error enviando:", e);
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

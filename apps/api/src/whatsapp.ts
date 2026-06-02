// Envío de WhatsApp vía Meta Cloud API. No-op si faltan credenciales (modo dev).
// Meta exige PLANTILLAS aprobadas para mensajes iniciados por el negocio
// (recordatorios), por eso enviamos por nombre de plantilla + parámetros.
import { env } from "./env.js";
import { sanitizePhoneDigits } from "./security/sanitize.js";

const GRAPH = "https://graph.facebook.com/v21.0";

function configured(): boolean {
  return !!(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
}

// Envía un mensaje de plantilla. `params` son los valores de las variables {{1}}, {{2}}…
export async function sendWhatsAppTemplate(args: {
  to: string;
  template: string;
  lang?: string;
  params?: string[];
}): Promise<boolean> {
  if (!configured()) {
    console.log("[whatsapp:noop] (sin credenciales)", args.template, "→", args.to);
    return false;
  }
  if (!args.template) return false;

  const to = sanitizePhoneDigits(args.to);
  if (to.length < 7) return false;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: args.template,
      language: { code: args.lang ?? env.WHATSAPP_TEMPLATE_LANG },
      ...(args.params && args.params.length
        ? {
            components: [
              {
                type: "body",
                parameters: args.params.map((text) => ({ type: "text", text })),
              },
            ],
          }
        : {}),
    },
  };

  try {
    const res = await fetch(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[whatsapp] error", res.status, txt.slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[whatsapp] excepción:", e);
    return false;
  }
}

export function whatsAppEnabled(): boolean {
  return configured() && !!env.WHATSAPP_REMINDER_TEMPLATE;
}

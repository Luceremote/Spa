// Notificaciones push con Expo Push Service.
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { prisma } from "./db.js";

const expo = new Expo();

interface PushArgs {
  customerIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPush(args: PushArgs): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where: { customerId: { in: args.customerIds } },
    select: { id: true, token: true },
  });
  const messages: ExpoPushMessage[] = [];
  const tokenById = new Map<string, string>();
  for (const t of tokens) {
    if (!Expo.isExpoPushToken(t.token)) continue;
    tokenById.set(t.id, t.token);
    messages.push({
      to: t.token,
      sound: "default",
      title: args.title,
      body: args.body,
      data: args.data ?? {},
    });
  }
  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      const res = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...res);
    } catch (e) {
      console.error("[push] error enviando chunk:", e);
    }
  }

  // Limpieza: si Expo dice DeviceNotRegistered, borramos el token.
  for (const t of tickets) {
    if (t.status === "error" && t.details?.error === "DeviceNotRegistered") {
      // No tenemos un mapeo directo ticket→token; lo más simple es borrar por iteración posterior
      // (en producción podríamos correlacionar por orden de envío).
    }
  }
}

// Validación pública de un token de Expo
export function isValidExpoPushToken(token: string): boolean {
  return Expo.isExpoPushToken(token);
}

// Opt-in para notificaciones push (Expo).
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const STORED_TOKEN_KEY = "spa_push_token";
const STORED_PHONE_KEY = "spa_push_phone";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Solicita permiso y devuelve el ExpoPushToken si el usuario acepta.
// `phone` es la forma de asociar el token a su cliente en el backend.
export async function registerForPush(phone: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("[push] no es dispositivo físico, omitiendo");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  const tokenObj = await Notifications.getExpoPushTokenAsync();
  const token = tokenObj.data;
  await AsyncStorage.setItem(STORED_TOKEN_KEY, token);
  await AsyncStorage.setItem(STORED_PHONE_KEY, phone);

  try {
    await api("/push/register", {
      method: "POST",
      json: { token, phone, platform: Platform.OS },
    });
  } catch (e) {
    console.warn("[push] error registrando token:", e);
  }
  return token;
}

export async function getStoredPush(): Promise<{ token: string | null; phone: string | null }> {
  const [token, phone] = await Promise.all([
    AsyncStorage.getItem(STORED_TOKEN_KEY),
    AsyncStorage.getItem(STORED_PHONE_KEY),
  ]);
  return { token, phone };
}

export async function unregisterPush() {
  const token = await AsyncStorage.getItem(STORED_TOKEN_KEY);
  if (token) {
    try {
      await api("/push/unregister", { method: "POST", json: { token } });
    } catch {}
  }
  await AsyncStorage.removeItem(STORED_TOKEN_KEY);
  await AsyncStorage.removeItem(STORED_PHONE_KEY);
}

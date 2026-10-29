import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * What the hand feels: "tap" for a small tick (a scoop placed), "press" for a
 * real action (a round created), "success" for a moment worth it (a tub put
 * away, an order arriving). The Android app uses the phone's haptics; a
 * browser vibrates if it can; elsewhere nothing happens.
 */
export type Feel = "tap" | "press" | "success";

const MS: Record<Feel, number | number[]> = { tap: 12, press: 25, success: [18, 60, 30] };

const vibrate = (feel: Feel) => {
  try {
    navigator.vibrate?.(MS[feel]);
  } catch {
    /* not allowed here */
  }
};

export function buzz(feel: Feel = "tap") {
  if (!Capacitor.isNativePlatform()) return vibrate(feel);
  // An APK older than the haptics plugin rejects: fall back to vibrate
  const done =
    feel === "success"
      ? Haptics.notification({ type: NotificationType.Success })
      : Haptics.impact({ style: feel === "tap" ? ImpactStyle.Light : ImpactStyle.Medium });
  done.catch(() => vibrate(feel));
}

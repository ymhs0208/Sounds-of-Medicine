export function notificationSupport(): "ok" | "unsupported" | "denied" | "granted" {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

export async function requestNotifications(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  const result = await Notification.requestPermission();
  return result === "granted" ? "granted" : "denied";
}

export async function showNotification(title: string, body: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;
  const options: NotificationOptions = {
    body,
    icon: "/icons/icon-192.png",
    lang: "zh-Hant",
  };
  const worker = "serviceWorker" in navigator ? navigator.serviceWorker.controller : null;
  if (worker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    } catch {
      /* The page Notification constructor is the fallback when the worker cannot show it. */
    }
  }
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

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

export function showNotification(title: string, body: string): boolean {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const notification = new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
    lang: "zh-Hant",
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  return true;
}

/**
 * Helper untuk Push Notification Browser & Mobile (Android Notification Drawer)
 */

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  } catch (error) {
    console.error("Gagal meminta izin notifikasi:", error);
    return false;
  }
}

export interface BackgroundNotificationOptions {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendBackgroundNotification({
  title,
  body,
  url = "/ai-assistant",
  tag = "dna-ai-completed",
}: BackgroundNotificationOptions): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    // Gunakan Service Worker Registration jika tersedia (sangat optimal untuk Android / HP saat di background)
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag,
          data: { url },
          // Pola getar HP: getar 300ms, jeda 100ms, getar 300ms
          vibrate: [300, 100, 300],
        } as NotificationOptions);
        return true;
      }
    }

    // Fallback menggunakan Notification API standar
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag,
      data: { url },
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error("Gagal mengirim notifikasi background:", error);
    return false;
  }
}

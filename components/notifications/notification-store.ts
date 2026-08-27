export type NotificationType = "success" | "info" | "error";

export interface AppNotification {
  id: string;
  feature: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  read: boolean;
  result?: string;
}

const STORAGE_KEY = "dna-ai-notifications";
const NOTIFICATION_EVENT = "dna-ai-notification-change";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getNotifications(): AppNotification[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (notification): notification is AppNotification =>
        typeof notification === "object" &&
        notification !== null &&
        typeof (notification as AppNotification).id === "string" &&
        typeof (notification as AppNotification).feature === "string" &&
        typeof (notification as AppNotification).title === "string" &&
        typeof (notification as AppNotification).message === "string" &&
        typeof (notification as AppNotification).type === "string" &&
        typeof (notification as AppNotification).createdAt === "number" &&
        typeof (notification as AppNotification).read === "boolean"
    );
  } catch (error) {
    console.error("Failed to read notifications:", error);
    return [];
  }
}

function saveNotifications(
  notifications: AppNotification[]
): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(notifications)
    );

    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT)
    );
  } catch (error) {
    console.error(
      "Failed to save notifications:",
      error
    );
  }
}

export function addNotification({
  feature,
  title,
  message,
  type = "success",
  result,
}: {
  feature: string;
  title: string;
  message: string;
  type?: NotificationType;
  result?: string;
}): void {
  if (!isBrowser()) {
    return;
  }

  const newNotification: AppNotification = {
    id:
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
    feature,
    title,
    message,
    type,
    createdAt: Date.now(),
    read: false,
    result,
  };

  const currentNotifications =
    getNotifications();

  saveNotifications([
    newNotification,
    ...currentNotifications,
  ]);
}

export function markAllNotificationsAsRead(): void {
  if (!isBrowser()) {
    return;
  }

  const notifications = getNotifications();

  saveNotifications(
    notifications.map((notification) => ({
      ...notification,
      read: true,
    }))
  );
}

export function markNotificationAsRead(
  id: string
): void {
  if (!isBrowser()) {
    return;
  }

  const notifications = getNotifications();

  saveNotifications(
    notifications.map((notification) =>
      notification.id === id
        ? {
            ...notification,
            read: true,
          }
        : notification
    )
  );
}

export function deleteNotification(
  id: string
): void {
  if (!isBrowser()) {
    return;
  }

  const notifications = getNotifications();

  saveNotifications(
    notifications.filter(
      (notification) =>
        notification.id !== id
    )
  );
}

export function clearAllNotifications(): void {
  if (!isBrowser()) {
    return;
  }

  saveNotifications([]);
}

export function subscribeToNotifications(
  callback: () => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = (): void => {
    callback();
  };

  window.addEventListener(
    NOTIFICATION_EVENT,
    handleChange
  );

  window.addEventListener(
    "storage",
    handleChange
  );

  return () => {
    window.removeEventListener(
      NOTIFICATION_EVENT,
      handleChange
    );

    window.removeEventListener(
      "storage",
      handleChange
    );
  };
}
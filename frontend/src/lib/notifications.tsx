"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, authenticatedFetch } from "@/lib/api";
import { BusinessStatus } from "@/lib/types";

interface StatusChangeEvent {
  businessId: string;
  businessName: string;
  previousStatus: BusinessStatus;
  newStatus: BusinessStatus;
  changedById: string | null;
  occurredAt: string;
}

export interface Notification {
  id: string;
  event: StatusChangeEvent;
  read: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  connected: boolean;
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NOTIFICATION_RETRY_DELAY_MS = 3000;

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  connected: false,
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | null = null;
    let controller: AbortController | null = null;

    function appendNotification(event: StatusChangeEvent) {
      const notification: Notification = {
        id: `${event.businessId}-${event.occurredAt}`,
        event,
        read: false,
      };
      setNotifications((prev) => [notification, ...prev]);
    }

    function parseEventChunk(chunk: string) {
      const payload = chunk
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (!payload) {
        return null;
      }

      try {
        return JSON.parse(payload) as StatusChangeEvent;
      } catch {
        return null;
      }
    }

    function scheduleReconnect() {
      if (cancelled) {
        return;
      }

      reconnectTimer = window.setTimeout(() => {
        void connect();
      }, NOTIFICATION_RETRY_DELAY_MS);
    }

    async function connect() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await authenticatedFetch("/notifications/stream", {
          headers: {
            Accept: "text/event-stream",
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.body) {
          throw new Error("Notification stream is unavailable.");
        }

        setConnected(true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split(/\r?\n\r?\n/);
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const event = parseEventChunk(chunk);
            if (event) {
              appendNotification(event);
            }
          }
        }

        buffer += decoder.decode();
        const finalEvent = parseEventChunk(buffer);
        if (finalEvent) {
          appendNotification(finalEvent);
        }
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setConnected(false);

        if (error instanceof ApiError && error.status === 401) {
          return;
        }

        scheduleReconnect();
        return;
      }

      if (!cancelled && !controller.signal.aborted) {
        setConnected(false);
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      cancelled = true;
      setConnected(false);
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      controller?.abort();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <NotificationContext.Provider
      value={{ notifications, connected, unreadCount, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

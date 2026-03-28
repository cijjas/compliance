"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

interface StatusChangeEvent {
  businessId: string;
  businessName: string;
  previousStatus: BusinessStatus;
  newStatus: BusinessStatus;
  changedById: string | null;
  occurredAt: string;
}

interface Notification {
  id: string;
  event: StatusChangeEvent;
  read: boolean;
}

const STATUS_ICON: Record<BusinessStatus, typeof CheckCircle2> = {
  [BusinessStatus.APPROVED]: CheckCircle2,
  [BusinessStatus.REJECTED]: AlertCircle,
  [BusinessStatus.IN_REVIEW]: Clock,
  [BusinessStatus.PENDING]: FileText,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTitle(event: StatusChangeEvent) {
  switch (event.newStatus) {
    case BusinessStatus.APPROVED:
      return "Company Approved";
    case BusinessStatus.REJECTED:
      return "Company Rejected";
    case BusinessStatus.IN_REVIEW:
      return "Moved to Review";
    case BusinessStatus.PENDING:
      return "Status Reset to Pending";
  }
}

function getDescription(event: StatusChangeEvent) {
  return `'${event.businessName}' status changed from ${STATUS_LABELS[event.previousStatus]} to ${STATUS_LABELS[event.newStatus]}.`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
    const url = `${apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data: StatusChangeEvent = JSON.parse(event.data);
        const notification: Notification = {
          id: `${data.businessId}-${data.occurredAt}`,
          event: data,
          read: false,
        };
        setNotifications((prev) => [notification, ...prev]);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayed =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">
            Compliance Monitoring
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Recent Notifications
          </h1>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCircle2 className="size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(["all", "unread"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${connected ? "bg-primary" : "bg-destructive"}`}
            />
            {connected ? "Connected" : "Disconnected"}
          </span>
          {unreadCount > 0 && (
            <span>
              {unreadCount} Unread
            </span>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {connected
                  ? "Listening for status changes in real time. Change a company's status to see notifications appear here."
                  : "Unable to connect to notification stream. Check that the backend is running."}
              </p>
            </CardContent>
          </Card>
        ) : (
          displayed.map((n) => {
            const Icon = STATUS_ICON[n.event.newStatus];
            const isRejection =
              n.event.newStatus === BusinessStatus.REJECTED;
            return (
              <Card
                key={n.id}
                className={!n.read ? "border-l-2 border-l-primary" : ""}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                      isRejection
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {getTitle(n.event)}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(n.event.occurredAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {getDescription(n.event)}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Link href={`/companies/${n.event.businessId}`}>
                        <Button variant="outline" size="xs">
                          View Company
                          <ArrowRight className="size-3" />
                        </Button>
                      </Link>
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => markRead(n.id)}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

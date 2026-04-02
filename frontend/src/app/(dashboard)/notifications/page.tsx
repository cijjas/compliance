"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { useNotifications } from "@/lib/notifications";
import { BusinessStatus } from "@/lib/types";
import { timeAgo, formatDateTime } from "@/lib/formatting";

const STATUS_ICON: Record<BusinessStatus, typeof CheckCircle2> = {
  [BusinessStatus.APPROVED]: CheckCircle2,
  [BusinessStatus.REJECTED]: AlertCircle,
  [BusinessStatus.IN_REVIEW]: Clock,
  [BusinessStatus.PENDING]: FileText,
};

const STATUS_ICON_STYLE: Record<BusinessStatus, string> = {
  [BusinessStatus.APPROVED]: "bg-emerald-50 text-emerald-600",
  [BusinessStatus.REJECTED]: "bg-rose-50 text-rose-600",
  [BusinessStatus.IN_REVIEW]: "bg-blue-50 text-blue-600",
  [BusinessStatus.PENDING]: "bg-amber-50 text-amber-600",
};

function getTitle(newStatus: BusinessStatus) {
  switch (newStatus) {
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

export default function NotificationsPage() {
  const { notifications, connected, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const displayed =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">
            Compliance Monitoring
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Notifications
          </h1>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-destructive"}`}
          />
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Filter tabs + mark all read */}
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
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1 text-xs opacity-70">({unreadCount})</span>
              )}
            </Button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {displayed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {connected
                ? "Listening for status changes in real time."
                : "Unable to connect. Check that the backend is running."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl bg-card">
          {displayed.map((n) => {
            const Icon = STATUS_ICON[n.event.newStatus];
            const iconStyle = STATUS_ICON_STYLE[n.event.newStatus];
            return (
              <div
                key={n.id}
                className="flex items-start gap-4 border-b border-border/40 last:border-0 px-6 py-4"
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconStyle}`}
                >
                  <Icon className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {getTitle(n.event.newStatus)}
                    </p>
                    {!n.read && (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    <Link
                      href={`/companies/${n.event.businessId}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {n.event.businessName}
                    </Link>
                    {" "}status changed
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={n.event.previousStatus} />
                    <span className="text-xs text-muted-foreground">&rarr;</span>
                    <StatusBadge status={n.event.newStatus} />
                  </div>
                </div>

                <div className="shrink-0 text-right space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(n.event.occurredAt)}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {formatDateTime(n.event.occurredAt)}
                  </p>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

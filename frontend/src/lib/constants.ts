import { BusinessStatus } from "@/lib/types";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const STATUS_LABELS: Record<BusinessStatus, string> = {
  [BusinessStatus.PENDING]: "Pending",
  [BusinessStatus.IN_REVIEW]: "In Review",
  [BusinessStatus.APPROVED]: "Approved",
  [BusinessStatus.REJECTED]: "Rejected",
};

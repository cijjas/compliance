import { BusinessStatus } from '../common/enums';

const ALLOWED_STATUS_TRANSITIONS: Record<
  BusinessStatus,
  readonly BusinessStatus[]
> = {
  [BusinessStatus.PENDING]: [BusinessStatus.IN_REVIEW, BusinessStatus.REJECTED],
  [BusinessStatus.IN_REVIEW]: [
    BusinessStatus.APPROVED,
    BusinessStatus.REJECTED,
  ],
  [BusinessStatus.APPROVED]: [BusinessStatus.IN_REVIEW],
  [BusinessStatus.REJECTED]: [BusinessStatus.IN_REVIEW],
};

function formatBusinessStatus(status: BusinessStatus): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getAllowedBusinessStatusTransitions(
  from: BusinessStatus,
): readonly BusinessStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[from];
}

export function canTransitionBusinessStatus(
  from: BusinessStatus,
  to: BusinessStatus,
): boolean {
  return getAllowedBusinessStatusTransitions(from).includes(to);
}

export function getBusinessStatusTransitionErrorMessage(
  from: BusinessStatus,
  to: BusinessStatus,
): string {
  const allowedTransitions = getAllowedBusinessStatusTransitions(from);

  if (allowedTransitions.length === 0) {
    return `Cannot move this business from "${formatBusinessStatus(from)}" to "${formatBusinessStatus(to)}" because "${formatBusinessStatus(from)}" has no further workflow transitions.`;
  }

  if (
    from === BusinessStatus.REJECTED &&
    to === BusinessStatus.PENDING &&
    allowedTransitions.includes(BusinessStatus.IN_REVIEW)
  ) {
    return 'Cannot move this business from "Rejected" to "Pending". Reopen the case by moving it to "In Review" first.';
  }

  if (
    from === BusinessStatus.APPROVED &&
    to === BusinessStatus.PENDING &&
    allowedTransitions.includes(BusinessStatus.IN_REVIEW)
  ) {
    return 'Cannot move this business from "Approved" to "Pending". Send it back to "In Review" first.';
  }

  const allowedLabels = allowedTransitions
    .map((status) => `"${formatBusinessStatus(status)}"`)
    .join(', ');
  const nextStepLabel =
    allowedTransitions.length === 1 ? 'Allowed next status' : 'Allowed next statuses';

  return `Cannot move this business from "${formatBusinessStatus(from)}" to "${formatBusinessStatus(to)}". ${nextStepLabel}: ${allowedLabels}.`;
}

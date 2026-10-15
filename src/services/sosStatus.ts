import { colors } from '../theme';
import type { SosReport } from '../screens/api';

// How an SOS's control-room status reads to the person who sent it.
const STATUS_COPY: Record<string, { label: string; detail: string; color: string }> = {
  active: {
    label: 'SOS sent',
    detail: 'Waiting for the control room to respond.',
    color: colors.danger,
  },
  acknowledged: {
    label: 'Seen by the control room',
    detail: 'Authorities have your location and are arranging help.',
    color: colors.warning,
  },
  dispatched: {
    label: 'Rescue team on the way',
    detail: 'Stay where you are if it is safe.',
    color: colors.info,
  },
  resolved: {
    label: 'Resolved',
    detail: 'The control room marked this SOS as resolved.',
    color: colors.success,
  },
};

export function describeSosStatus(report: Pick<SosReport, 'status' | 'assignedTeam'>) {
  const copy = STATUS_COPY[report.status] ?? STATUS_COPY.active;
  const detail =
    report.status === 'dispatched' && report.assignedTeam
      ? `${report.assignedTeam} is on the way. Stay where you are if it is safe.`
      : copy.detail;
  return { ...copy, detail };
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'Being handled',
  fulfilled: 'Fulfilled',
};

export function describeRequestStatus(status: string) {
  return REQUEST_STATUS_LABELS[status] ?? status;
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  // Hermes throws on toLocaleDateString() for an invalid date.
  if (Number.isNaN(time)) return '';
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

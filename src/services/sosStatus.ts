import { colors } from '../theme';
import type { SosReport } from '../screens/api';
import type { OutboxItem } from './sosOutbox';

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

// How an SOS that is still on this phone reads. Each label says only what is
// actually known: a gateway answer means the gateway has it, never that
// DisasterX or a rescuer received it. Only a server receipt says "received".
export function describeOutboxItem(item: Pick<OutboxItem, 'state'> & Partial<Pick<OutboxItem, 'gatewayStatus'>>) {
  switch (item.state) {
    case 'delivered':
      return {
        label: 'SOS received by DisasterX',
        detail: 'The control room has your alert. This screen shows when they respond.',
        color: colors.danger,
      };
    case 'delivery_unconfirmed':
      return {
        label: 'Received by the gateway · not yet confirmed by DisasterX',
        detail:
          item.gatewayStatus === 'sent_to_remote'
            ? 'The DisasterX gateway stored your SOS and broadcast it over LoRa radio, but nothing confirms that a rescue receiver heard it. It will also be sent to the control room as soon as the internet is back.'
            : 'The DisasterX gateway stored your SOS. The gateway cannot confirm that a rescue receiver or the control room has it. It will also be sent to the control room as soon as the internet is back.',
        color: colors.warning,
      };
    case 'failed':
      return {
        label: 'The gateway refused this SOS',
        detail:
          'The DisasterX gateway did not accept it. It is still saved on this phone and will be sent to the control room when the internet is back. Call 112 if you can.',
        color: colors.danger,
      };
    default:
      if (item.gatewayStatus === 'unknown') {
        return {
          label: 'Gateway did not answer in time',
          detail:
            'The DisasterX gateway may or may not have your SOS. It stays saved on this phone and goes to the control room with the same reference when the internet is back, so it is not counted twice. If you can, call 112.',
          color: colors.warning,
        };
      }
      return {
        label: 'Saved on this phone',
        detail:
          'No internet and no DisasterX gateway right now. Your SOS is saved and will be sent automatically when either comes back. If you can, call 112.',
        color: colors.textSecondary,
      };
  }
}

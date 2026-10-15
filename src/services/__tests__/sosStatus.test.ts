import { describeRequestStatus, describeSosStatus } from '../sosStatus';

describe('describeSosStatus', () => {
  it('names the dispatched team when the control room set one', () => {
    const status = describeSosStatus({ status: 'dispatched', assignedTeam: 'NDRF Team 4' });
    expect(status.label).toBe('Rescue team on the way');
    expect(status.detail).toContain('NDRF Team 4');
  });

  it('covers every control room status', () => {
    expect(describeSosStatus({ status: 'active' }).label).toBe('SOS sent');
    expect(describeSosStatus({ status: 'acknowledged' }).label).toBe('Seen by the control room');
    expect(describeSosStatus({ status: 'resolved' }).label).toBe('Resolved');
  });

  it('falls back to "sent" for an unknown status', () => {
    expect(describeSosStatus({ status: 'something-new' }).label).toBe('SOS sent');
  });
});

describe('describeRequestStatus', () => {
  it('turns backend statuses into readable labels', () => {
    expect(describeRequestStatus('in_progress')).toBe('Being handled');
    expect(describeRequestStatus('fulfilled')).toBe('Fulfilled');
  });
});

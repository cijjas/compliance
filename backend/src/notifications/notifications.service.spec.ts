import { firstValueFrom } from 'rxjs';
import { BusinessStatus } from '../common/enums';
import { NotificationsService, StatusChangeEvent } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService();
  });

  it('emits events that are received by subscribers', async () => {
    const event: StatusChangeEvent = {
      businessId: 'business-1',
      businessName: 'Acme Corp SA',
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.IN_REVIEW,
      changedById: 'admin-1',
      occurredAt: '2026-03-28T12:00:00.000Z',
    };

    const promise = firstValueFrom(service.getStatusChanges$());
    service.emitStatusChange(event);

    await expect(promise).resolves.toEqual(event);
  });

  it('delivers events to multiple subscribers', async () => {
    const event: StatusChangeEvent = {
      businessId: 'business-2',
      businessName: 'Beta Corp',
      previousStatus: BusinessStatus.IN_REVIEW,
      newStatus: BusinessStatus.APPROVED,
      changedById: null,
      occurredAt: '2026-03-28T13:00:00.000Z',
    };

    const promise1 = firstValueFrom(service.getStatusChanges$());
    const promise2 = firstValueFrom(service.getStatusChanges$());
    service.emitStatusChange(event);

    await expect(promise1).resolves.toEqual(event);
    await expect(promise2).resolves.toEqual(event);
  });
});

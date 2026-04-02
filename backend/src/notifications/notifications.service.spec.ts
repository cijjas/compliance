import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { BusinessStatus } from '../common/enums';
import { Notification } from '../common/entities';
import {
  NotificationsService,
  StatusChangeEvent,
} from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepo: jest.Mocked<
    Pick<Repository<Notification>, 'create' | 'save' | 'find' | 'update'>
  >;

  beforeEach(() => {
    notificationRepo = {
      create: jest.fn((dto) => dto as Notification),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    service = new NotificationsService(
      notificationRepo as unknown as Repository<Notification>,
    );
  });

  it('persists and emits events that are received by subscribers', async () => {
    const event: StatusChangeEvent = {
      businessId: 'business-1',
      businessName: 'Acme Corp SA',
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.IN_REVIEW,
      changedById: 'admin-1',
      occurredAt: '2026-03-28T12:00:00.000Z',
    };

    const promise = firstValueFrom(service.getStatusChanges$());
    await service.emitStatusChange(event);

    await expect(promise).resolves.toEqual(event);
    expect(notificationRepo.save).toHaveBeenCalledTimes(1);
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
    await service.emitStatusChange(event);

    await expect(promise1).resolves.toEqual(event);
    await expect(promise2).resolves.toEqual(event);
  });

  it('findAll returns persisted notifications', async () => {
    const notifications = [{ id: 'n1' }, { id: 'n2' }] as Notification[];
    notificationRepo.find.mockResolvedValue(notifications);

    await expect(service.findAll()).resolves.toBe(notifications);
    expect(notificationRepo.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  });

  it('markRead updates a single notification', async () => {
    await service.markRead('n1');
    expect(notificationRepo.update).toHaveBeenCalledWith('n1', { read: true });
  });

  it('markAllRead updates all unread notifications', async () => {
    await service.markAllRead();
    expect(notificationRepo.update).toHaveBeenCalledWith(
      { read: false },
      { read: true },
    );
  });
});

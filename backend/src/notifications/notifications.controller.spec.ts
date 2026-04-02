import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { BusinessStatus } from '../common/enums';
import { Notification } from '../common/entities';
import { NotificationsController } from './notifications.controller';
import {
  NotificationsService,
  StatusChangeEvent,
} from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<
    Pick<
      NotificationsService,
      'getStatusChanges$' | 'findAll' | 'markRead' | 'markAllRead'
    >
  >;

  beforeEach(async () => {
    notificationsService = {
      getStatusChanges$: jest.fn(),
      findAll: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    controller = module.get(NotificationsController);
  });

  it('stream maps status-change events into SSE message payloads', async () => {
    const event: StatusChangeEvent = {
      businessId: '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
      businessName: 'Acme Corp SA',
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.IN_REVIEW,
      changedById: 'admin-1',
      occurredAt: '2026-03-27T12:00:00.000Z',
    };
    notificationsService.getStatusChanges$.mockReturnValue(of(event));

    await expect(firstValueFrom(controller.stream())).resolves.toEqual({
      data: event,
    });
    expect(notificationsService.getStatusChanges$).toHaveBeenCalled();
  });

  it('findAll delegates to service', async () => {
    const notifications = [{ id: 'n1' }] as Notification[];
    notificationsService.findAll.mockResolvedValue(notifications);

    await expect(controller.findAll()).resolves.toBe(notifications);
  });

  it('markRead delegates to service', async () => {
    notificationsService.markRead.mockResolvedValue(undefined);

    await controller.markRead('n1');
    expect(notificationsService.markRead).toHaveBeenCalledWith('n1');
  });

  it('markAllRead delegates to service', async () => {
    notificationsService.markAllRead.mockResolvedValue(undefined);

    await controller.markAllRead();
    expect(notificationsService.markAllRead).toHaveBeenCalled();
  });
});

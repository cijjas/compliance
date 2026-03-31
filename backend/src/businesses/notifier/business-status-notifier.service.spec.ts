import { BusinessStatus } from '../../common/enums';
import { NotificationsService } from '../../notifications/notifications.service';
import { BusinessStatusNotifierService } from './business-status-notifier.service';

describe('BusinessStatusNotifierService', () => {
  let service: BusinessStatusNotifierService;
  let notificationsService: jest.Mocked<
    Pick<NotificationsService, 'emitStatusChange'>
  >;

  beforeEach(() => {
    notificationsService = { emitStatusChange: jest.fn() };

    service = new BusinessStatusNotifierService(
      notificationsService as unknown as NotificationsService,
    );
  });

  it('emits a status change event to the notifications service', () => {
    service.notifyStatusChanged({
      businessId: 'business-1',
      businessName: 'Acme Corp SA',
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.APPROVED,
      changedById: 'admin-1',
    });

    expect(notificationsService.emitStatusChange).toHaveBeenCalledTimes(1);

    const event = notificationsService.emitStatusChange.mock.calls[0][0];
    expect(event).toMatchObject({
      businessId: 'business-1',
      businessName: 'Acme Corp SA',
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.APPROVED,
      changedById: 'admin-1',
    });
    expect(event.occurredAt).toBeDefined();
  });

  it('defaults changedById to null when not provided', () => {
    service.notifyStatusChanged({
      businessId: 'business-1',
      businessName: 'Acme Corp SA',
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.IN_REVIEW,
    });

    const event = notificationsService.emitStatusChange.mock.calls[0][0];
    expect(event.changedById).toBeNull();
  });
});

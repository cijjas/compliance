import { Injectable, Logger } from '@nestjs/common';
import { BusinessStatus } from '../../common/enums';
import { NotificationsService } from '../../notifications/notifications.service';

interface NotifyStatusChangedInput {
  businessId: string;
  businessName: string;
  previousStatus: BusinessStatus;
  newStatus: BusinessStatus;
  changedById?: string | null;
}

@Injectable()
export class BusinessStatusNotifierService {
  private readonly logger = new Logger(BusinessStatusNotifierService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  notifyStatusChanged(input: NotifyStatusChangedInput): void {
    const event = {
      businessId: input.businessId,
      businessName: input.businessName,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      changedById: input.changedById ?? null,
      occurredAt: new Date().toISOString(),
    };

    this.logger.log({
      event: 'business.status.changed',
      ...event,
    });

    this.notificationsService.emitStatusChange(event);
  }
}

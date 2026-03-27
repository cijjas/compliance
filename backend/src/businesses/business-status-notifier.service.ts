import { Injectable, Logger } from '@nestjs/common';
import { BusinessStatus } from '../common/enums';

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

  notifyStatusChanged(input: NotifyStatusChangedInput): void {
    this.logger.log(
      JSON.stringify({
        event: 'business.status.changed',
        businessId: input.businessId,
        businessName: input.businessName,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        changedById: input.changedById ?? null,
        occurredAt: new Date().toISOString(),
      }),
    );
  }
}

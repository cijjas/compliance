import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { BusinessStatus } from '../common/enums';

export interface StatusChangeEvent {
  businessId: string;
  businessName: string;
  previousStatus: BusinessStatus;
  newStatus: BusinessStatus;
  changedById: string | null;
  occurredAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly statusChanges$ = new Subject<StatusChangeEvent>();

  emitStatusChange(event: StatusChangeEvent): void {
    this.statusChanges$.next(event);
  }

  getStatusChanges$() {
    return this.statusChanges$.asObservable();
  }
}

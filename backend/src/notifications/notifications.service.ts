import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { BusinessStatus } from '../common/enums';
import { Notification } from '../common/entities';

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

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async emitStatusChange(event: StatusChangeEvent): Promise<void> {
    await this.notificationRepo.save(
      this.notificationRepo.create({
        businessId: event.businessId,
        businessName: event.businessName,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        changedById: event.changedById,
        occurredAt: new Date(event.occurredAt),
      }),
    );

    this.statusChanges$.next(event);
  }

  getStatusChanges$() {
    return this.statusChanges$.asObservable();
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markRead(id: string): Promise<void> {
    await this.notificationRepo.update(id, { read: true });
  }

  async markAllRead(): Promise<void> {
    await this.notificationRepo.update({ read: false }, { read: true });
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BusinessStatus } from '../enums';
import { Business } from './business.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'business_id' })
  businessId!: string;

  @Column({ name: 'business_name' })
  businessName!: string;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: BusinessStatus,
    nullable: true,
  })
  previousStatus!: BusinessStatus | null;

  @Column({ name: 'new_status', type: 'enum', enum: BusinessStatus })
  newStatus!: BusinessStatus;

  @Column({ name: 'changed_by_id', type: 'uuid', nullable: true })
  changedById!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

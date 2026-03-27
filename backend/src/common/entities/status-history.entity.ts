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
import { User } from './user.entity';

@Entity('status_history')
export class StatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Business, (business) => business.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'business_id' })
  businessId!: string;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: BusinessStatus,
    nullable: true,
  })
  previousStatus!: BusinessStatus | null;

  @Column({ name: 'new_status', type: 'enum', enum: BusinessStatus })
  newStatus!: BusinessStatus;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy!: User | null;

  @Column({ name: 'changed_by_id', nullable: true })
  changedById!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

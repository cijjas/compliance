import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BusinessStatus } from '../enums';
import { Document } from './document.entity';
import { StatusHistory } from './status-history.entity';
import { User } from './user.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'tax_identifier', unique: true })
  taxIdentifier!: string;

  @Column({ length: 2 })
  country!: string;

  @Column()
  industry!: string;

  @Column({
    type: 'enum',
    enum: BusinessStatus,
    default: BusinessStatus.PENDING,
  })
  status!: BusinessStatus;

  @Column({ name: 'risk_score', type: 'int', nullable: true })
  riskScore!: number | null;

  @Column({ name: 'identifier_validated', default: false })
  identifierValidated!: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User | null;

  @Column({ name: 'created_by_id', nullable: true })
  createdById!: string | null;

  @OneToMany(() => Document, (doc) => doc.business, { cascade: true })
  documents!: Document[];

  @OneToMany(() => StatusHistory, (sh) => sh.business, { cascade: true })
  statusHistory!: StatusHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

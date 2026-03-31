import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RiskSettingKey {
  DOCUMENTATION_RISK_POINTS = 'documentation_risk_points',
  MANUAL_REVIEW_THRESHOLD = 'manual_review_threshold',
}

@Entity('risk_settings')
export class RiskSetting {
  @PrimaryColumn()
  key!: RiskSettingKey;

  @Column({ name: 'numeric_value', type: 'int' })
  numericValue!: number;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('country_policies')
export class CountryPolicy {
  @PrimaryColumn({ length: 2 })
  code!: string;

  @Column()
  name!: string;

  @Column({ name: 'risk_points', type: 'int', default: 0 })
  riskPoints!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

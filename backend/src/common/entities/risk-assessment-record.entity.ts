import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('risk_assessment_records')
export class RiskAssessmentRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'business_id' })
  businessId!: string;

  @Column({ type: 'int' })
  score!: number;

  @Column({ name: 'requires_manual_review', type: 'boolean' })
  requiresManualReview!: boolean;

  @Column({ name: 'country_risk', type: 'int' })
  countryRisk!: number;

  @Column({ name: 'industry_risk', type: 'int' })
  industryRisk!: number;

  @Column({ name: 'documentation_risk', type: 'int' })
  documentationRisk!: number;

  @Column({ name: 'missing_document_types', type: 'text', array: true, default: '{}' })
  missingDocumentTypes!: string[];

  @Column({ name: 'policy_version', length: 64 })
  policyVersion!: string;

  @CreateDateColumn({ name: 'assessed_at' })
  assessedAt!: Date;
}

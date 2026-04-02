import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { DocumentType } from '../enums';
import { Business } from './business.entity';
import { User } from './user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Business, (business) => business.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'business_id' })
  businessId!: string;

  @Column({ type: 'enum', enum: DocumentType })
  type!: DocumentType;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Exclude()
  @Column({ name: 'file_path' })
  filePath!: string;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy!: User | null;

  @Column({ name: 'uploaded_by_id', type: 'uuid', nullable: true })
  uploadedById!: string | null;

  @Column({ name: 'checksum', type: 'varchar', length: 64, nullable: true })
  checksum!: string | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

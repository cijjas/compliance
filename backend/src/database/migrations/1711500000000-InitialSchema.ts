import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711500000000 implements MigrationInterface {
  name = 'InitialSchema1711500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enums
    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM('admin', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "business_status_enum" AS ENUM('pending', 'in_review', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "document_type_enum" AS ENUM('fiscal_certificate', 'registration_proof', 'insurance_policy', 'other')`,
    );

    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "password" varchar NOT NULL,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'viewer',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Businesses table
    await queryRunner.query(`
      CREATE TABLE "businesses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "tax_identifier" varchar NOT NULL UNIQUE,
        "country" varchar(2) NOT NULL,
        "industry" varchar NOT NULL,
        "status" "business_status_enum" NOT NULL DEFAULT 'pending',
        "risk_score" int,
        "identifier_validated" boolean NOT NULL DEFAULT false,
        "created_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_businesses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_businesses_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Documents table
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" uuid NOT NULL,
        "type" "document_type_enum" NOT NULL,
        "file_name" varchar NOT NULL,
        "file_path" varchar NOT NULL,
        "mime_type" varchar NOT NULL,
        "file_size" int NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_documents_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // Status history table
    await queryRunner.query(`
      CREATE TABLE "status_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" uuid NOT NULL,
        "previous_status" "business_status_enum",
        "new_status" "business_status_enum" NOT NULL,
        "reason" text,
        "changed_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_status_history_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_status_history_changed_by" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_businesses_status" ON "businesses" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_businesses_country" ON "businesses" ("country")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_businesses_name" ON "businesses" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_businesses_tax_identifier" ON "businesses" ("tax_identifier")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_business" ON "documents" ("business_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_status_history_business" ON "status_history" ("business_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "status_history"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "businesses"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "document_type_enum"`);
    await queryRunner.query(`DROP TYPE "business_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}

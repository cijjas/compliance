import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentAuditAndRiskSnapshots1711800000000
  implements MigrationInterface
{
  name = 'AddDocumentAuditAndRiskSnapshots1711800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD COLUMN "uploaded_by_id" uuid,
      ADD COLUMN "checksum" varchar(64),
      ADD COLUMN "version" int NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD CONSTRAINT "FK_documents_uploaded_by"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_documents_uploaded_by_id" ON "documents" ("uploaded_by_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "risk_assessment_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "score" int NOT NULL,
        "requires_manual_review" boolean NOT NULL,
        "country_risk" int NOT NULL,
        "industry_risk" int NOT NULL,
        "documentation_risk" int NOT NULL,
        "missing_document_types" text[] NOT NULL DEFAULT '{}',
        "policy_version" varchar(64) NOT NULL,
        "assessed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_risk_assessment_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_risk_assessment_records_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_risk_assessment_records_business_id" ON "risk_assessment_records" ("business_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_risk_assessment_records_assessed_at" ON "risk_assessment_records" ("assessed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_risk_assessment_records_assessed_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_risk_assessment_records_business_id"`,
    );
    await queryRunner.query(`DROP TABLE "risk_assessment_records"`);

    await queryRunner.query(
      `DROP INDEX "IDX_documents_uploaded_by_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "documents"
      DROP CONSTRAINT "FK_documents_uploaded_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "documents"
      DROP COLUMN "version",
      DROP COLUMN "checksum",
      DROP COLUMN "uploaded_by_id"
    `);
  }
}

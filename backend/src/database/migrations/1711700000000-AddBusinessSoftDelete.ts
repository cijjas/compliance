import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessSoftDelete1711700000000 implements MigrationInterface {
  name = 'AddBusinessSoftDelete1711700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "businesses"
      ADD COLUMN "deleted_by_id" uuid,
      ADD COLUMN "deletion_reason" text,
      ADD COLUMN "deleted_at" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "businesses"
      ADD CONSTRAINT "FK_businesses_deleted_by"
      FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_businesses_deleted_at" ON "businesses" ("deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_businesses_deleted_at"`);
    await queryRunner.query(`
      ALTER TABLE "businesses"
      DROP CONSTRAINT "FK_businesses_deleted_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "businesses"
      DROP COLUMN "deleted_at",
      DROP COLUMN "deletion_reason",
      DROP COLUMN "deleted_by_id"
    `);
  }
}

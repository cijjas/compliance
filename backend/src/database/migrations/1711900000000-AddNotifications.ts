import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1711900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        business_name VARCHAR NOT NULL,
        previous_status business_status_enum,
        new_status business_status_enum NOT NULL,
        changed_by_id UUID,
        occurred_at TIMESTAMPTZ NOT NULL,
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notifications_read ON notifications (read) WHERE read = false
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE notifications');
  }
}

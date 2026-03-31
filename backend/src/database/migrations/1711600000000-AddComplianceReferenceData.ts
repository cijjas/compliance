import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComplianceReferenceData1711600000000 implements MigrationInterface {
  name = 'AddComplianceReferenceData1711600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "country_policies" (
        "code" varchar(2) NOT NULL,
        "name" varchar NOT NULL,
        "risk_points" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_country_policies" PRIMARY KEY ("code"),
        CONSTRAINT "CHK_country_policies_risk_points" CHECK ("risk_points" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "industry_policies" (
        "key" varchar NOT NULL,
        "label" varchar NOT NULL,
        "risk_points" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_industry_policies" PRIMARY KEY ("key"),
        CONSTRAINT "CHK_industry_policies_risk_points" CHECK ("risk_points" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "risk_settings" (
        "key" varchar NOT NULL,
        "numeric_value" int NOT NULL,
        "description" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_risk_settings" PRIMARY KEY ("key"),
        CONSTRAINT "CHK_risk_settings_numeric_value" CHECK ("numeric_value" >= 0)
      )
    `);

    await queryRunner.query(`
      INSERT INTO "country_policies" ("code", "name", "risk_points")
      VALUES
        ('AR', 'Argentina', 0),
        ('AF', 'Afghanistan', 30),
        ('BR', 'Brazil', 0),
        ('CL', 'Chile', 0),
        ('CO', 'Colombia', 0),
        ('CU', 'Cuba', 30),
        ('DE', 'Germany', 0),
        ('ES', 'Spain', 0),
        ('GB', 'United Kingdom', 0),
        ('IR', 'Iran', 30),
        ('KP', 'North Korea', 30),
        ('MM', 'Myanmar', 30),
        ('MX', 'Mexico', 0),
        ('PE', 'Peru', 0),
        ('SY', 'Syria', 30),
        ('US', 'United States', 0),
        ('UY', 'Uruguay', 0),
        ('VE', 'Venezuela', 30),
        ('YE', 'Yemen', 30)
    `);

    await queryRunner.query(`
      INSERT INTO "industry_policies" ("key", "label", "risk_points")
      VALUES
        ('agriculture', 'Agriculture', 0),
        ('casino', 'Casino', 25),
        ('construction', 'Construction', 25),
        ('consulting', 'Consulting', 0),
        ('crypto', 'Crypto', 25),
        ('currency_exchange', 'Currency Exchange', 25),
        ('education', 'Education', 0),
        ('energy', 'Energy', 0),
        ('finance', 'Finance', 0),
        ('gambling', 'Gambling', 25),
        ('healthcare', 'Healthcare', 0),
        ('legal_services', 'Legal Services', 0),
        ('logistics', 'Logistics', 0),
        ('manufacturing', 'Manufacturing', 0),
        ('real_estate', 'Real Estate', 0),
        ('retail', 'Retail', 0),
        ('security', 'Security', 25),
        ('technology', 'Technology', 0),
        ('transportation', 'Transportation', 0)
    `);

    await queryRunner.query(`
      INSERT INTO "risk_settings" ("key", "numeric_value", "description")
      VALUES
        ('documentation_risk_points', 20, 'Penalty applied when required compliance documents are missing.'),
        ('manual_review_threshold', 70, 'Minimum score that requires manual review.')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "risk_settings"`);
    await queryRunner.query(`DROP TABLE "industry_policies"`);
    await queryRunner.query(`DROP TABLE "country_policies"`);
  }
}

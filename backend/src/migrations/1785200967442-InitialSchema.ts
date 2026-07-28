import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785200967442 implements MigrationInterface {
    name = 'InitialSchema1785200967442'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notes" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "category_id" integer, "title" character varying(255) NOT NULL DEFAULT '', "content" text NOT NULL DEFAULT '', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_note_user_category" ON "notes" ("user_id", "category_id") `);
        await queryRunner.query(`CREATE INDEX "idx_note_user_updated" ON "notes" ("user_id", "updated_at") `);
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "name" character varying(50) NOT NULL, "color" character varying(7) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uniq_user_category_name" UNIQUE ("user_id", "name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "is_staff" boolean NOT NULL DEFAULT false, "date_joined" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "revoked_tokens" ("jti" character varying NOT NULL, "expires_at" bigint NOT NULL, CONSTRAINT "PK_b18aa48269f87cafba8c6310624" PRIMARY KEY ("jti"))`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_7708dcb62ff332f0eaf9f0743a7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_3d5c6951d7233408f4f9359a5c1" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_2296b7fe012d95646fa41921c8b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_2296b7fe012d95646fa41921c8b"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_3d5c6951d7233408f4f9359a5c1"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_7708dcb62ff332f0eaf9f0743a7"`);
        await queryRunner.query(`DROP TABLE "revoked_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."idx_note_user_updated"`);
        await queryRunner.query(`DROP INDEX "public"."idx_note_user_category"`);
        await queryRunner.query(`DROP TABLE "notes"`);
    }

}

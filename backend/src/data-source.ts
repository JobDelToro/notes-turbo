import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Note } from './entities/note.entity';
import { RevokedToken } from './entities/revoked-token.entity';

/**
 * DataSource for the TypeORM CLI (migration:generate / migration:run) against
 * Postgres. The running app configures TypeORM via `database.ts`; this file
 * exists only so the CLI can diff entities and emit/apply migrations.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Category, Note, RevokedToken],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});

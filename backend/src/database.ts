import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Note } from './entities/note.entity';
import { RevokedToken } from './entities/revoked-token.entity';

const ENTITIES = [User, Category, Note, RevokedToken];

/**
 * Database options, mirroring the Django setup: zero-config SQLite locally (via
 * sql.js, a pure-JS/WASM engine so there is no native build), and Postgres for
 * prod parity when `DATABASE_URL` is set. The test suite runs fully in-memory.
 */
export function databaseOptions(): TypeOrmModuleOptions {
  const url = process.env.DATABASE_URL;
  if (url) {
    return {
      type: 'postgres',
      url,
      entities: ENTITIES,
      synchronize: true, // challenge scope; a real prod deploy would use migrations
    };
  }

  const inMemory = process.env.NODE_ENV === 'test';
  return {
    type: 'sqljs',
    entities: ENTITIES,
    synchronize: true,
    autoSave: !inMemory,
    location: inMemory ? undefined : 'data/dev.sqlite',
  } as TypeOrmModuleOptions;
}

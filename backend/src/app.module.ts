import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { databaseOptions } from './database';
import { jwtSecret } from './auth/jwt.config';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { NotesModule } from './notes/notes.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: databaseOptions }),
    // Base throttler; auth (10/min) and AI (20/min) override per-route via @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1_000 }]),
    JwtModule.register({ global: true, secret: jwtSecret() }),
    AuthModule,
    CategoriesModule,
    NotesModule,
    AiModule,
  ],
})
export class AppModule {}

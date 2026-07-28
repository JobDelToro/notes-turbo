import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { RevokedToken } from '../entities/revoked-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenCleanupService } from './token-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Category, RevokedToken])],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    TokenCleanupService,
    // Applied globally: every route requires auth unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}

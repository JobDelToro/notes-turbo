import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AiContentDto } from './dto/ai-content.dto';
import { CategoriesService } from '../categories/categories.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../entities/user.entity';
import { ScopedThrottlerGuard } from '../common/scoped-throttler.guard';
import { ThrottleScope } from '../common/throttle-scope.decorator';

// LLM calls cost money, so both AI endpoints SHARE one 20/min counter (the `ai`
// scope), matching Django's ScopedRateThrottle rather than 20/min per endpoint.
@Controller('ai')
@UseGuards(ScopedThrottlerGuard)
@ThrottleScope('ai')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly categories: CategoriesService,
  ) {}

  @Post('categorize')
  @HttpCode(200)
  async categorize(@CurrentUser() user: User, @Body() dto: AiContentDto) {
    const categories = await this.categories.getMiniForUser(user.id);
    return this.ai.categorize(dto.content, categories);
  }

  @Post('summarize')
  @HttpCode(200)
  async summarize(@Body() dto: AiContentDto) {
    return this.ai.summarize(dto.content);
  }
}

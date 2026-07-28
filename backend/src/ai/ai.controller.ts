import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AiContentDto } from './dto/ai-content.dto';
import { CategoriesService } from '../categories/categories.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../entities/user.entity';

// LLM calls cost money, so the AI endpoints are rate-limited (20/min per client).
@Controller('ai')
@UseGuards(ThrottlerGuard)
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

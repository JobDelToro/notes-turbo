import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** GET /api/categories/ — the current user's categories with note counts. */
  @Get()
  list(@CurrentUser() user: User) {
    return this.categories.listWithCounts(user.id);
  }
}

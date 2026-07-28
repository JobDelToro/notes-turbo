import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Note } from '../entities/note.entity';

export interface CategoryWithCount {
  id: number;
  name: string;
  color: string;
  note_count: number;
}

export interface CategoryMini {
  id: number;
  name: string;
  color: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Note) private readonly notes: Repository<Note>,
  ) {}

  /** The user's categories, each annotated with how many of their notes it holds. */
  async listWithCounts(userId: number): Promise<CategoryWithCount[]> {
    const cats = await this.categories.find({ where: { userId }, order: { id: 'ASC' } });

    const rawCounts = await this.notes
      .createQueryBuilder('n')
      .select('n.category_id', 'categoryId')
      .addSelect('COUNT(*)', 'cnt')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.category_id IS NOT NULL')
      .groupBy('n.category_id')
      .getRawMany<{ categoryId: number | string; cnt: number | string }>();

    const counts = new Map<number, number>(
      rawCounts.map((r) => [Number(r.categoryId), Number(r.cnt)]),
    );

    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      note_count: counts.get(c.id) ?? 0,
    }));
  }

  /** Minimal id/name/color rows, for the AI classifier's category choices. */
  async getMiniForUser(userId: number): Promise<CategoryMini[]> {
    const cats = await this.categories.find({ where: { userId }, order: { id: 'ASC' } });
    return cats.map((c) => ({ id: c.id, name: c.name, color: c.color }));
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../entities/note.entity';
import { Category } from '../entities/category.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note) private readonly notes: Repository<Note>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
  ) {}

  /** A page of the user's notes (optionally filtered to one category), newest-edited first. */
  async list(
    userId: number,
    categoryId: number | null,
    page: number,
    pageSize: number,
  ): Promise<{ rows: Note[]; count: number }> {
    const where = categoryId != null ? { userId, categoryId } : { userId };
    const [rows, count] = await this.notes.findAndCount({
      where,
      relations: ['category'],
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });
    return { rows, count };
  }

  /** Look up one of the user's notes, or 404 (never leak another user's note). */
  async findOwned(userId: number, id: number): Promise<Note> {
    const note = await this.notes.findOne({ where: { id, userId }, relations: ['category'] });
    if (!note) throw new NotFoundException('No Note matches the given query.');
    return note;
  }

  async create(userId: number, dto: CreateNoteDto): Promise<Note> {
    await this.assertCategoryOwned(userId, dto.category);
    const note = this.notes.create({
      userId,
      title: dto.title ?? '',
      content: dto.content ?? '',
      categoryId: dto.category ?? null,
    });
    const saved = await this.notes.save(note);
    return this.findOwned(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.notes.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException('No Note matches the given query.');

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.category !== undefined) {
      await this.assertCategoryOwned(userId, dto.category);
      note.categoryId = dto.category;
    }
    await this.notes.save(note);
    return this.findOwned(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    const result = await this.notes.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('No Note matches the given query.');
  }

  /** A note may only reference a category its owner holds. */
  private async assertCategoryOwned(userId: number, categoryId?: number | null): Promise<void> {
    if (categoryId == null) return;
    if (!(await this.categories.existsBy({ id: categoryId, userId }))) {
      throw new BadRequestException('Invalid category.');
    }
  }
}

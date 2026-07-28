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
    const category = await this.resolveCategory(userId, dto.category);
    const note = this.notes.create({
      userId,
      title: dto.title ?? '',
      content: dto.content ?? '',
      categoryId: category?.id ?? null,
    });
    const saved = await this.notes.save(note);
    saved.category = category; // attach for serialization without a refetch
    return saved;
  }

  async update(userId: number, id: number, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.notes.findOne({ where: { id, userId }, relations: ['category'] });
    if (!note) throw new NotFoundException('No Note matches the given query.');

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.category !== undefined) {
      const category = await this.resolveCategory(userId, dto.category);
      note.category = category;
      note.categoryId = category?.id ?? null;
    }
    await this.notes.save(note);
    return note; // relation is already in hand — no refetch
  }

  async remove(userId: number, id: number): Promise<void> {
    const result = await this.notes.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('No Note matches the given query.');
  }

  /** Resolve a category the user owns (or null); one lookup that also validates ownership. */
  private async resolveCategory(
    userId: number,
    categoryId?: number | null,
  ): Promise<Category | null> {
    if (categoryId == null) return null;
    const category = await this.categories.findOne({ where: { id: categoryId, userId } });
    if (!category) throw new BadRequestException('Invalid category.');
    return category;
  }
}

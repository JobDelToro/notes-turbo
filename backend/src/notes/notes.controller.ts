import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { serializeNote } from './note.serializer';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../entities/user.entity';
import { buildPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Page } from '../common/pagination';
import type { NoteDto } from './note.serializer';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ): Promise<Page<NoteDto>> {
    const categoryId = this.parseCategory(category);
    const p = this.parsePositiveInt(page, 1);
    const size = Math.min(this.parsePositiveInt(pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const { rows, count } = await this.notes.list(user.id, categoryId, p, size);
    const extra = categoryId != null ? `&category=${categoryId}` : '';
    return buildPage(rows.map(serializeNote), count, p, size, '/api/notes/', extra);
  }

  @Get(':id')
  async retrieve(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NoteDto> {
    return serializeNote(await this.notes.findOwned(user.id, id));
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: User, @Body() dto: CreateNoteDto): Promise<NoteDto> {
    return serializeNote(await this.notes.create(user.id, dto));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteDto> {
    return serializeNote(await this.notes.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.notes.remove(user.id, id);
  }

  private parseCategory(raw?: string): number | null {
    if (raw === undefined || raw === '') return null;
    const n = Number(raw);
    if (!Number.isInteger(n)) throw new BadRequestException('Must be an integer id.');
    return n;
  }

  private parsePositiveInt(raw: string | undefined, fallback: number): number {
    const n = Number(raw ?? fallback);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ListNotesQueryDto } from './dto/list-notes-query.dto';
import { NoteIdPipe } from './note-id.pipe';
import { serializeNote } from './note.serializer';
import type { NoteDto } from './note.serializer';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../entities/user.entity';
import { buildPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Page } from '../common/pagination';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query() query: ListNotesQueryDto,
  ): Promise<Page<NoteDto>> {
    const categoryId = query.category ?? null;
    const page = query.page ?? 1;
    const size = Math.min(query.page_size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const { rows, count } = await this.notes.list(user.id, categoryId, page, size);
    const extra = categoryId != null ? `&category=${categoryId}` : '';
    return buildPage(rows.map(serializeNote), count, page, size, '/api/notes/', extra);
  }

  @Get(':id')
  async retrieve(
    @CurrentUser() user: User,
    @Param('id', NoteIdPipe) id: number,
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
    @Param('id', NoteIdPipe) id: number,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteDto> {
    return serializeNote(await this.notes.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id', NoteIdPipe) id: number): Promise<void> {
    await this.notes.remove(user.id, id);
  }
}

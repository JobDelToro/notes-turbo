import { IsInt, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/** All fields optional (PATCH / autosave). `category: null` moves a note to Uncategorized. */
export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  content?: string;

  @ValidateIf((o: UpdateNoteDto) => o.category !== null && o.category !== undefined)
  @IsInt()
  category?: number | null;
}

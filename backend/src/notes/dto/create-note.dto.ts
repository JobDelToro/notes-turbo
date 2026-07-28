import { IsInt, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  content?: string;

  // `null` is valid (uncategorized); any other value must be an integer id.
  @ValidateIf((o: CreateNoteDto) => o.category !== null && o.category !== undefined)
  @IsInt()
  category?: number | null;
}

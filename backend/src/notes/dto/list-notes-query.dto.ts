import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Validated query for GET /notes/. @Type coerces the raw string params to numbers. */
export class ListNotesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'category must be an integer id.' })
  category?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_size?: number;
}

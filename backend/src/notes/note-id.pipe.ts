import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';

/**
 * Parse a note id path param. A non-integer id becomes a 404 (matching Django's
 * router, which turns a bad pk into "not found"), not a 400.
 */
@Injectable()
export class NoteIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!Number.isInteger(id)) {
      throw new NotFoundException('No Note matches the given query.');
    }
    return id;
  }
}

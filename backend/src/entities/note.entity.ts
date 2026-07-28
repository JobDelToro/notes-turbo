import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';

/**
 * A note. Owned by a user; optionally filed under one of that user's
 * categories. Deleting a category sets the note's category to NULL (the note
 * survives, it just becomes uncategorized).
 */
@Entity('notes')
// The two indexes match the only two ways the API reads notes.
@Index('idx_note_user_updated', ['userId', 'updatedAt'])
@Index('idx_note_user_category', ['userId', 'categoryId'])
export class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => Category, (category) => category.notes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null;

  @Column({ length: 255, default: '' })
  title!: string;

  @Column({ type: 'text', default: '' })
  content!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

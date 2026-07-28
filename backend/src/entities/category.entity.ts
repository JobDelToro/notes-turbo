import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Note } from './note.entity';

/** A colour-coded bucket. Names are unique per user (not globally). */
@Entity('categories')
@Unique('uniq_user_category_name', ['userId', 'name'])
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ length: 50 })
  name!: string;

  /** `#RRGGBB` hex. */
  @Column({ length: 7 })
  color!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Note, (note) => note.category)
  notes!: Note[];
}

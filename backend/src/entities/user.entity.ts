import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Note } from './note.entity';

/** A person. Authenticates by email (there is no username). */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column()
  email!: string;

  /** bcrypt hash; never serialized to the client. */
  @Column()
  password!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_staff', default: false })
  isStaff!: boolean;

  @CreateDateColumn({ name: 'date_joined' })
  dateJoined!: Date;

  @OneToMany(() => Category, (category) => category.user)
  categories!: Category[];

  @OneToMany(() => Note, (note) => note.user)
  notes!: Note[];
}

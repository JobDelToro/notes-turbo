import { User } from '../entities/user.entity';

export interface PublicUser {
  id: number;
  email: string;
  date_joined: string;
}

/** The public shape of a user (never includes the password hash). */
export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    date_joined: new Date(user.dateJoined).toISOString(),
  };
}

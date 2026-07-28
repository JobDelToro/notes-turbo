import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Blacklist of refresh-token ids (jti). A refresh token is revoked on logout and
 * on rotation, so a leaked or replayed refresh token cannot outlive its session.
 */
@Entity('revoked_tokens')
export class RevokedToken {
  @PrimaryColumn()
  jti!: string;

  /** Unix seconds; lets a sweeper drop rows once the token would have expired. */
  @Column({ name: 'expires_at', type: 'bigint' })
  expiresAt!: number;
}

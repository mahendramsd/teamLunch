import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';

@Entity('session_members')
export class SessionMember {
  @PrimaryColumn()
  sessionId: number;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => Session, (session) => session.members)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @ManyToOne(() => User, (user) => user.sessionMemberships)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}

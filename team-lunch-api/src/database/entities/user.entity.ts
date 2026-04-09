import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Session } from './session.entity';
import { SessionMember } from './session-member.entity';
import { Restaurant } from './restaurant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  googleId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Session, (session) => session.owner)
  ownedSessions: Session[];

  @OneToMany(() => SessionMember, (member) => member.user)
  sessionMemberships: SessionMember[];

  @OneToMany(() => Restaurant, (restaurant) => restaurant.submittedBy)
  restaurants: Restaurant[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column()
  submittedById: number;

  @ManyToOne(() => User, (user) => user.restaurants)
  @JoinColumn({ name: 'submittedById' })
  submittedBy: User;

  @Column()
  sessionId: number;

  @ManyToOne(() => Session, (session) => session.restaurants)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @CreateDateColumn()
  createdAt: Date;
}

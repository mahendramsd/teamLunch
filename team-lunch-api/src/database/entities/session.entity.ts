import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Restaurant } from './restaurant.entity';
import { SessionMember } from './session-member.entity';

export enum SessionStatus {
  OPEN = 'OPEN',
  ENDED = 'ENDED',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.OPEN })
  status: SessionStatus;

  @Column()
  ownerId: number;

  @ManyToOne(() => User, (user) => user.ownedSessions)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ nullable: true })
  pickedRestaurantId: number;

  @ManyToOne(() => Restaurant, { nullable: true })
  @JoinColumn({ name: 'pickedRestaurantId' })
  pickedRestaurant: Restaurant;

  @OneToMany(() => Restaurant, (restaurant) => restaurant.session)
  restaurants: Restaurant[];

  @OneToMany(() => SessionMember, (member) => member.session)
  members: SessionMember[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  endedAt: Date;
}

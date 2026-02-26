import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.OPEN })
  status: TaskStatus;

  // Creates a userId foreign key column in the task table.
  // eager: false means the user won't be loaded automatically with every task query.
  @ManyToOne(() => User, (user) => user.tasks, { eager: false })
  user: User;
  
  // Stores just the userId directly — useful when you need the id
  // without loading the full user object.
  @Column()
  userId: string;

}
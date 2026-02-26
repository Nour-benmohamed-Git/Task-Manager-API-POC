import { Task } from 'src/tasks/task.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string; // will be hashed, never plain text

  // One user owns many tasks.
  // eager: false = tasks are NOT auto-loaded with every user query.
  @OneToMany(() => Task, (task) => task.user, { eager: false })
  tasks: Task[];
}
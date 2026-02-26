import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { User } from 'src/users/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) { }

  // Only returns tasks belonging to the logged-in user
  async getAll(user: User): Promise<Task[]> {
    return this.taskRepository.find({ where: { userId: user.id } });
  }

  // Finds task by id AND checks it belongs to this user
  async getById(id: string, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.userId !== user.id) throw new ForbiddenException(`This task is not yours`);
    return task;
  }

  // Saves the task with the full user object — TypeORM extracts the userId automatically
  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description } = createTaskDto;
    const task = this.taskRepository.create({
      title,
      description,
      status: TaskStatus.OPEN,
      user, // TypeORM will populate userId from this
    });
    return this.taskRepository.save(task);
  }

  async updateStatus(id: string, status: TaskStatus, user: User): Promise<Task> {
    const task = await this.getById(id, user);
    task.status = status;
    return this.taskRepository.save(task);
  }

  async delete(id: string, user: User): Promise<void> {
    const task = await this.getById(id, user);
    await this.taskRepository.remove(task);
  }
}
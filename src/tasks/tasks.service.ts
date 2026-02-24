import { Injectable, NotFoundException } from '@nestjs/common';
import { Task, TaskStatus } from './task.model';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TasksService {
  private tasks: Task[] = []; 

  getAll(): Task[] {
    return this.tasks;
  }

  getById(id: string): Task {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  create(title: string, description: string): Task {
    const task: Task = {
      id: uuid(),
      title,
      description,
      status: TaskStatus.OPEN,
    };
    this.tasks.push(task);
    return task;
  }

  updateStatus(id: string, status: TaskStatus): Task {
    const task = this.getById(id);
    task.status = status;
    return task;
  }

  delete(id: string): void {
    this.getById(id); // throws if not found
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }
}
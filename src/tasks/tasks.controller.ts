import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/user.entity';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  getAll(@GetUser() user: User) {
    return this.tasksService.getAll(user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.getById(id, user);
  }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User) {
    return this.tasksService.create(createTaskDto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @GetUser() user: User,
  ) {
    return this.tasksService.updateStatus(id, dto.status, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.delete(id, user);
  }
}
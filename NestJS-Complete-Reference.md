# NestJS Complete Concept Reference
> Task Manager POC — Everything You Need to Know

---

## Table of Contents

1. [CLI Commands](#1-cli-commands)
2. [The @Module() Decorator](#2-the-module-decorator)
3. [Module Configuration Patterns](#3-module-configuration-patterns)
4. [Controllers](#4-controllers)
5. [Services & Dependency Injection](#5-services--dependency-injection)
6. [Entities & TypeORM](#6-entities--typeorm)
7. [DTOs & Validation](#7-dtos--validation)
8. [Pipes](#8-pipes)
9. [Guards](#9-guards)
10. [JWT Authentication & Passport](#10-jwt-authentication--passport)
11. [Custom Decorators](#11-custom-decorators)
12. [Interceptors](#12-interceptors)
13. [Exception Filters](#13-exception-filters)
14. [Configuration & Environment Variables](#14-configuration--environment-variables)
15. [Swagger / OpenAPI](#15-swagger--openapi)
16. [Recommended Folder Architecture](#16-recommended-folder-architecture)
17. [main.ts Bootstrap & Registration Order](#17-maints-bootstrap--registration-order)
18. [Quick Reference Cheatsheet](#18-quick-reference-cheatsheet)

---

## 1. CLI Commands

The NestJS CLI accelerates development by generating boilerplate and auto-registering everything in the correct module.

### Installation

```bash
npm install -g @nestjs/cli
```

Install once globally. After this, the `nest` command is available anywhere on your machine.

### Create a New Project

```bash
nest new project-name
```

Scaffolds a full project with the recommended folder structure, installs dependencies, and sets up TypeScript config.

### Generate Commands (`nest g`)

| What | Full Command | Shorthand | Creates |
|---|---|---|---|
| Module | `nest generate module name` | `nest g mo name` | `name.module.ts` |
| Controller | `nest generate controller name` | `nest g co name` | `name.controller.ts` + spec |
| Service | `nest generate service name` | `nest g s name` | `name.service.ts` + spec |
| Guard | `nest generate guard name` | `nest g gu name` | `name.guard.ts` |
| Interceptor | `nest generate interceptor name` | `nest g in name` | `name.interceptor.ts` |
| Filter | `nest generate filter name` | `nest g f name` | `name.filter.ts` |
| Pipe | `nest generate pipe name` | `nest g pi name` | `name.pipe.ts` |
| Decorator | `nest generate decorator name` | `nest g d name` | `name.decorator.ts` |

> 💡 The CLI not only creates the file but also **automatically imports and registers it** in the nearest module. Always use the CLI instead of creating files manually.

### Commands Used in This POC

```bash
nest new task-manager          # bootstrap the project
nest g mo tasks                # generate tasks module
nest g co tasks                # generate tasks controller
nest g s  tasks                # generate tasks service
nest g mo auth                 # generate auth module
nest g s  auth                 # generate auth service
nest g co auth                 # generate auth controller
nest g mo users                # generate users module
nest g s  users                # generate users service

npm run start:dev              # start with hot reload (watch mode)
```

---

## 2. The @Module() Decorator

> 📘 **Key Concept: Module**
> A Module is a class decorated with `@Module()` that groups related code (controllers, services, entities) into a cohesive feature block. Every NestJS app has at least one module — the root `AppModule`. Think of modules like packages: each feature has its own, and they can import from each other in a controlled way.

The `@Module()` decorator accepts a configuration object with four possible keys:

---

### 2.1 `imports: []`

Lists other modules whose **exported** providers you want to use inside this module.

```typescript
@Module({
  imports: [
    UsersModule,                          // makes UsersService injectable here
    PassportModule,                       // sets up Passport.js infrastructure
    TypeOrmModule.forFeature([Task]),     // registers Task repository
    JwtModule.registerAsync({ ... }),     // configures and exposes JwtService
  ]
})
```

> 💡 Importing a module only gives you access to what it explicitly **exports**. Private providers stay private.

---

### 2.2 `controllers: []`

Lists all controllers owned by this module. NestJS instantiates them and mounts their routes in the HTTP layer.

```typescript
@Module({
  controllers: [TasksController]
})
```

---

### 2.3 `providers: []`

Lists all injectable classes that belong to this module — services, strategies, guards, etc. NestJS adds them to the module's DI container.

```typescript
@Module({
  providers: [
    TasksService,   // owns and creates this service instance
    JwtStrategy,    // Passport discovers it just by being registered here
    AuthService,    // injectable into AuthController
  ]
})
```

> ⚠️ **Never declare a service in `providers` of two different modules.** A service is owned by exactly one module. Other modules borrow it via `imports` + `exports`.

---

### 2.4 `exports: []`

Lists which providers from this module should be available to other modules that import this module. Without `exports`, everything stays private.

```typescript
@Module({
  providers: [UsersService],
  exports:   [UsersService],  // now other modules can use it
})
```

> 💡 `exports` is the **public API** of your module. Only expose what other modules genuinely need.

---

### 2.5 The Full Module DI Picture

Here is what `AuthModule`'s DI container contains at runtime and where each provider comes from:

| Provider | Source | How it arrives |
|---|---|---|
| `AuthService` | AuthModule | Declared in `providers[]` — manufactured here |
| `JwtStrategy` | AuthModule | Declared in `providers[]` — manufactured here |
| `UsersService` | UsersModule | `UsersModule` exports it + `AuthModule` imports `UsersModule` |
| `JwtService` | JwtModule | `JwtModule` exposes it internally when configured with `registerAsync` |

---

## 3. Module Configuration Patterns

### 3.1 `forRoot()` — Global Static Configuration

Used to configure a module once at the root level (in `AppModule`). Pass values directly.

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  // ... static values
})
```

### 3.2 `forRootAsync()` — Global Config with Dependency Injection

Same as `forRoot` but lets you inject dependencies (like `ConfigService`) before the module configures itself. Use this whenever your config values come from environment variables.

```typescript
TypeOrmModule.forRootAsync({
  imports:    [ConfigModule],       // make ConfigService available
  inject:     [ConfigService],      // pass it as arg to useFactory
  useFactory: (config: ConfigService) => ({
    type:             'postgres',
    host:             config.get('DB_HOST'),   // read from .env
    port:             config.get<number>('DB_PORT'),
    autoLoadEntities: true,   // auto-loads entities registered with forFeature
    synchronize:      true,   // auto-creates tables — DEV ONLY
  }),
})
```

> ⚠️ `synchronize: true` is convenient in development but **can cause data loss in production**. Use migrations in prod.

### 3.3 `forFeature()` — Scoped Entity Registration

Registers specific entities (and their repositories) within a feature module. Keeps things scoped — the Tasks module only knows about the Task table.

```typescript
TypeOrmModule.forFeature([Task])  // makes Repository<Task> injectable in this module
```

> 💡 `forRoot` sets up the DB connection globally. `forFeature` makes a specific entity's repository available in a specific module.

### 3.4 `registerAsync()` — Async Module Configuration

Same pattern as `forRootAsync` but for other modules like `JwtModule`.

```typescript
JwtModule.registerAsync({
  imports:    [ConfigModule],
  inject:     [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret:      config.get('JWT_SECRET'),
    signOptions: { expiresIn: '1d' },
  }),
})
```

**How it works step by step:**
1. NestJS starts up
2. Sees `JwtModule.registerAsync`
3. Initializes `ConfigModule` first
4. Injects `ConfigService` into `useFactory`
5. `useFactory` runs → returns `{ secret, signOptions }`
6. `JwtModule` is configured with those values
7. `JwtService` is now available for injection in `AuthService`

---

## 4. Controllers

> 📘 **Key Concept: Controller**
> A Controller handles incoming HTTP requests and returns responses. It is the entry point of your HTTP layer. Controllers should be **thin** — receive data, call a service, return the result. Business logic lives in services, never in controllers.

### 4.1 `@Controller()` — Class Decorator

```typescript
@Controller('tasks')   // all routes in this class are prefixed with /tasks
export class TasksController { }
```

### 4.2 HTTP Method Decorators

| Decorator | HTTP Method | Example |
|---|---|---|
| `@Get()` | GET | `@Get()` → `GET /tasks` |
| `@Get(':id')` | GET | `@Get(':id')` → `GET /tasks/:id` |
| `@Post()` | POST | `@Post()` → `POST /tasks` |
| `@Patch(':id')` | PATCH | `@Patch(':id')` → `PATCH /tasks/:id` |
| `@Put(':id')` | PUT | `@Put(':id')` → `PUT /tasks/:id` |
| `@Delete(':id')` | DELETE | `@Delete(':id')` → `DELETE /tasks/:id` |

### 4.3 Parameter Decorators

Used to extract data from the incoming request inside a handler method.

| Decorator | What it extracts | Example |
|---|---|---|
| `@Body()` | Entire request body | `@Body() dto: CreateTaskDto` |
| `@Body('field')` | Single field from body | `@Body('title') title: string` |
| `@Param('id')` | URL route parameter | `@Param('id') id: string` |
| `@Query('q')` | URL query string param | `@Query('q') search: string` |
| `@Req()` | Full Express request object | `@Req() req: Request` |
| `@Res()` | Full Express response object | `@Res() res: Response` |
| `@Headers()` | Request headers | `@Headers('auth') token: string` |
| `@GetUser()` | Custom — logged-in user | `@GetUser() user: User` (we built this) |

### 4.4 Full Controller Example

```typescript
@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(AuthGuard('jwt'))  // protect ALL routes in this controller
export class TasksController {
  // NestJS injects TasksService automatically — you never call new TasksService()
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
```

---

## 5. Services & Dependency Injection

> 📘 **Key Concept: `@Injectable()` & Dependency Injection**
> The `@Injectable()` decorator marks a class as a **provider** that can be injected into other classes. NestJS manages a DI container — a registry of instances. When a class declares a dependency in its constructor, NestJS looks it up and injects it automatically. You **never** call `new Service()` manually.

### 5.1 Basic Service Structure

```typescript
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,  // injected by NestJS
  ) {}

  async getAll(user: User): Promise<Task[]> {
    return this.taskRepository.find({ where: { userId: user.id } });
  }

  async getById(id: string, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.userId !== user.id) throw new ForbiddenException('This task is not yours');
    return task;
  }

  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description } = createTaskDto;
    const task = this.taskRepository.create({ title, description, status: TaskStatus.OPEN, user });
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
```

### 5.2 Why DI? Key Benefits

- **Decoupling** — classes do not create their own dependencies, making them easy to swap
- **Testability** — inject mock services in unit tests trivially
- **Singleton by default** — NestJS creates one instance and shares it across the app
- **Automatic wiring** — you declare what you need, NestJS figures out the order and instantiation

---

## 6. Entities & TypeORM

> 📘 **Key Concept: Entity**
> An Entity is a TypeScript class decorated with `@Entity()` that maps directly to a database table. Each property with a column decorator maps to a column. TypeORM reads these decorators and handles all SQL automatically — no raw queries needed for CRUD.

### 6.1 Entity Decorators

| Decorator | Purpose | Example |
|---|---|---|
| `@Entity()` | Marks class as a DB table | `@Entity() export class Task {}` |
| `@PrimaryGeneratedColumn('uuid')` | Auto-generated UUID primary key | `id: string` |
| `@PrimaryGeneratedColumn()` | Auto-incrementing integer PK | `id: number` |
| `@Column()` | Maps property to a DB column | `title: string` |
| `@Column({ unique: true })` | Column with unique constraint | `username: string` |
| `@Column({ type: 'enum', enum: TaskStatus })` | Enum column type | `status: TaskStatus` |
| `@Column({ default: TaskStatus.OPEN })` | Column with default value | `status: TaskStatus` |
| `@ManyToOne()` | Many-to-one relation (adds FK column) | Task → User |
| `@OneToMany()` | One-to-many relation (inverse side) | User → Tasks |

### 6.2 Task Entity — Full Example

```typescript
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

  // Creates a userId FK column — many tasks belong to one user
  @ManyToOne(() => User, (user) => user.tasks, { eager: false })
  user: User;

  @Column()
  userId: string;  // FK value, populated automatically by TypeORM
}
```

### 6.3 Relations Example

```typescript
// Task Entity — "many tasks belong to one user"
@ManyToOne(() => User, (user) => user.tasks, { eager: false })
user: User;

// User Entity — "one user has many tasks" (inverse side)
@OneToMany(() => Task, (task) => task.user, { eager: false })
tasks: Task[];
```

> 💡 `eager: false` means the related entity is **not** automatically loaded with every query. Use `eager: true` only when you always need the relation.

### 6.4 Repository Pattern

> 📘 **Key Concept: Repository**
> TypeORM gives you a `Repository<Entity>` for each entity with ready-made methods for all CRUD operations. Your service injects it and calls its methods — no raw SQL needed. This keeps business logic decoupled from the database driver.

| Method | What it does |
|---|---|
| `find({ where: { userId } })` | `SELECT * WHERE userId = ...` |
| `findOne({ where: { id } })` | `SELECT * WHERE id = ... LIMIT 1` |
| `create({ title, description })` | Creates an entity instance (does **NOT** save to DB yet) |
| `save(entity)` | `INSERT` or `UPDATE` — persists to DB |
| `remove(entity)` | `DELETE` the entity (loads it first) |
| `delete(id)` | `DELETE` by id — does **not** load the entity first |
| `count({ where: { ... } })` | `COUNT` rows matching condition |

### 6.5 `@InjectRepository()`

```typescript
constructor(
  @InjectRepository(Task)           // tells NestJS: inject the Repository<Task>
  private taskRepository: Repository<Task>,
) {}
```

---

## 7. DTOs & Validation

> 📘 **Key Concept: DTO (Data Transfer Object)**
> A DTO is a plain class that defines the **shape and validation rules** of data coming into your API. When combined with `class-validator` decorators and `ValidationPipe`, it automatically validates every incoming request and rejects bad data before it ever reaches your service.

### 7.1 `class-validator` Decorators

| Decorator | Validates that... |
|---|---|
| `@IsString()` | Value is a string |
| `@IsNotEmpty()` | Value is not empty / null / undefined |
| `@IsEnum(EnumType)` | Value is a valid member of the enum |
| `@MinLength(n)` | String has at least n characters |
| `@MaxLength(n)` | String has at most n characters |
| `@IsNumber()` | Value is a number |
| `@IsBoolean()` | Value is a boolean |
| `@IsOptional()` | Field can be absent (skips other validators if missing) |
| `@IsEmail()` | Value is a valid email format |
| `@IsUUID()` | Value is a valid UUID |

### 7.2 DTO Examples

```typescript
// create-task.dto.ts
export class CreateTaskDto {
  @ApiProperty({ example: 'Learn NestJS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Build a POC' })
  @IsString()
  @IsNotEmpty()
  description: string;
}

// update-task-status.dto.ts
export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}

// auth.dto.ts
export class AuthDto {
  @ApiProperty({ example: 'alice' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6)
  password: string;
}
```

---

## 8. Pipes

> 📘 **Key Concept: Pipe**
> A Pipe sits between the incoming request and the route handler. It can **transform** data (e.g. string → number) or **validate** it (throw an error if rules fail). `ValidationPipe` is the most used pipe and does both.

### 8.1 ValidationPipe — Global Setup

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist:            true,  // silently strips unknown fields
    forbidNonWhitelisted: true,  // throws 400 if unknown fields are sent
    transform:            true,  // auto-converts payloads to DTO class instances
  }),
);
```

| Option | Effect |
|---|---|
| `whitelist: true` | Any field not declared in the DTO is stripped automatically |
| `forbidNonWhitelisted: true` | Instead of stripping, throw a 400 error for unknown fields |
| `transform: true` | Transforms plain JSON into DTO class instances and converts types |

### 8.2 Built-in Pipes

| Pipe | What it does |
|---|---|
| `ValidationPipe` | Validates incoming data using class-validator decorators on DTOs |
| `ParseIntPipe` | Transforms a string route param to an integer |
| `ParseUUIDPipe` | Validates that a route param is a valid UUID |
| `ParseBoolPipe` | Transforms `"true"`/`"false"` strings to boolean |
| `DefaultValuePipe` | Provides a default value if the param is undefined |

### 8.3 Levels of Application

```typescript
// 1. Global — applies to every route in the app
app.useGlobalPipes(new ValidationPipe());

// 2. Controller — applies to all routes in the controller
@UsePipes(new ValidationPipe())
@Controller('tasks')
export class TasksController {}

// 3. Route method — applies only to this route
@Post()
@UsePipes(new ValidationPipe())
create() {}

// 4. Parameter — applies only to this specific parameter
create(@Body(new ValidationPipe()) dto: CreateTaskDto) {}
```

---

## 9. Guards

> 📘 **Key Concept: Guard**
> A Guard decides whether a request is **allowed to proceed** to the route handler. It returns `true` (allow) or `false` (deny / 403). Guards run after middleware but before the handler. The most common use is authentication.

### 9.1 `AuthGuard('jwt')`

Provided by `@nestjs/passport`. It runs `JwtStrategy` automatically — extracts the Bearer token, verifies it, calls `validate()`, and attaches the user to `req.user`. If anything fails, it returns `401 Unauthorized`.

```typescript
// Applied at controller level — protects ALL routes
@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TasksController { }

// Applied at method level — protects only this route
@Get(':id')
@UseGuards(AuthGuard('jwt'))
getById() { }
```

### 9.2 NestJS Request Lifecycle (Execution Order)

| Order | Layer | Purpose |
|---|---|---|
| 1 | **Middleware** | Runs before everything — logging, CORS, etc. |
| 2 | **Guards** | Authentication / Authorization check |
| 3 | **Interceptors (pre)** | Transform request before handler |
| 4 | **Pipes** | Validate and transform input data |
| 5 | **Route Handler** | Your controller method executes |
| 6 | **Interceptors (post)** | Transform response after handler |
| 7 | **Exception Filter** | Catches any error thrown at any point |

---

## 10. JWT Authentication & Passport

### 10.1 How JWT Works

```
// Login flow:
1. Client sends username + password
2. Server verifies credentials against DB (bcrypt.compare)
3. Server signs a token: jwtService.sign({ username }) → "eyJhbGci..."
4. Client receives and stores the token

// Protected route flow:
1. Client sends: Authorization: Bearer eyJhbGci...
2. JwtStrategy extracts and verifies the token signature
3. validate() is called with the decoded payload { username }
4. Returned user is attached to req.user
5. Route handler runs — @GetUser() extracts req.user
```

> 💡 No session, no DB lookup needed on every request. The JWT signature proves identity — the secret is the key.

### 10.2 JwtStrategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    configService.get('JWT_SECRET'),
    });
  }

  // Runs after token is verified — return value becomes req.user
  async validate(payload: { username: string }) {
    const user = await this.usersService.findByUsername(payload.username);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

> 💡 Simply registering `JwtStrategy` as a provider in `AuthModule` is enough for Passport to discover and activate it. You never inject it manually anywhere.

### 10.3 AuthService — Register & Login

```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(username: string, password: string) {
    const user = await this.usersService.createUser(username, password);
    return { message: 'User created', username: user.username };
  }

  async login(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ username: user.username });
    return { accessToken: token };
  }
}
```

### 10.4 Password Hashing with bcrypt

```typescript
// Hashing — when registering a user
const hashed = await bcrypt.hash(plainPassword, 10);  // 10 = salt rounds (2^10 iterations)

// Comparing — when logging in
const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
// Returns true/false — you NEVER decrypt a bcrypt hash
```

> 💡 Salt rounds: 10 is the standard. Higher = more secure but slower. **Never store plain text passwords.**

---

## 11. Custom Decorators

> 📘 **Key Concept: Custom Parameter Decorator**
> `createParamDecorator()` lets you build your own parameter decorators. Perfect for extracting frequently needed data from the request — like the logged-in user — into a reusable shortcut instead of writing `req.user` everywhere.

```typescript
// src/auth/decorators/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/user.entity';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;  // attached by JwtStrategy.validate()
  },
);

// Usage in any controller:
@Get()
getAll(@GetUser() user: User) {
  return this.tasksService.getAll(user);
}
```

> 💡 `ExecutionContext` is a wrapper around the underlying platform (HTTP, WebSocket, gRPC). `switchToHttp()` gives access to the Express request/response objects.

---

## 12. Interceptors

> 📘 **Key Concept: Interceptor**
> An Interceptor wraps around a route handler — it runs **before AND after** the handler. It uses RxJS `Observable` under the hood. Common uses: transform all responses into a unified shape, measure execution time, add metadata, or cache results.

### 12.1 TransformInterceptor — Unified Response Shape

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,  // access to request/response objects
    next: CallHandler,          // represents the route handler itself
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next
      .handle()    // calls the actual route handler
      .pipe(
        map((data) => ({   // transforms the response value
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        })),
      );
  }
}

// Register globally in main.ts:
app.useGlobalInterceptors(new TransformInterceptor());
```

Every successful response now looks like:
```json
{
  "data": { "accessToken": "eyJ..." },
  "timestamp": "2026-02-25T22:00:00.000Z",
  "path": "/auth/login"
}
```

### 12.2 Key Pieces

| Piece | Role |
|---|---|
| `NestInterceptor` | Interface your interceptor must implement |
| `ExecutionContext` | Access to request/response objects |
| `CallHandler` | Represents the route handler — call `.handle()` to invoke it |
| `next.handle()` | Returns an Observable stream of the response value |
| `.pipe(map(...))` | RxJS operator that transforms the stream before sending to client |

---

## 13. Exception Filters

> 📘 **Key Concept: Exception Filter**
> An Exception Filter catches errors thrown anywhere in the app and lets you control exactly what the client receives. Without it, unhandled errors can leak stack traces. With it, you have one central place to format all errors consistently and log them on the server.

### 13.1 Global Exception Filter

```typescript
@Catch()  // no argument = catches ALL exceptions
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    // Known NestJS HTTP exception → use its status
    // Unknown crash → 500 Internal Server Error
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    // Log server-side with stack trace
    this.logger.error(
      `${request.method} ${request.url} → ${statusCode}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Send clean response to client
    response.status(statusCode).json({
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

// Register globally in main.ts:
app.useGlobalFilters(new AllExceptionsFilter());
```

### 13.2 Built-in HTTP Exceptions

| Exception | Status | When to use |
|---|---|---|
| `NotFoundException` | 404 | Resource not found by ID |
| `UnauthorizedException` | 401 | Not authenticated (no/invalid token) |
| `ForbiddenException` | 403 | Authenticated but not allowed (wrong user) |
| `BadRequestException` | 400 | Malformed request data |
| `ConflictException` | 409 | Duplicate resource (e.g. username already taken) |
| `InternalServerErrorException` | 500 | Unexpected server error |
| `UnprocessableEntityException` | 422 | Valid format but fails business rules |

---

## 14. Configuration & Environment Variables

`@nestjs/config` loads `.env` files and makes them available anywhere in the app via `ConfigService`.

### Setup

```typescript
// app.module.ts
ConfigModule.forRoot({ isGlobal: true })  // loads .env, available app-wide
```

### `.env` file

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=taskmanager
JWT_SECRET=supersecretkey123
```

### Using ConfigService

```typescript
@Injectable()
export class AnyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    const secret = this.configService.get('JWT_SECRET');
    const port   = this.configService.get<number>('DB_PORT');  // typed
  }
}
```

> ⚠️ Add `.env` to `.gitignore` — **never commit credentials to version control.**

---

## 15. Swagger / OpenAPI

`@nestjs/swagger` auto-generates an interactive API documentation page at `/api` by reading your existing decorators and DTOs.

### 15.1 Setup in main.ts

```typescript
const config = new DocumentBuilder()
  .setTitle('Task Manager API')
  .setDescription('NestJS + PostgreSQL POC')
  .setVersion('1.0')
  .addBearerAuth()  // adds the Authorization header input in the UI
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);  // UI at http://localhost:3000/api
```

### 15.2 Swagger Decorators

| Decorator | Where | Purpose |
|---|---|---|
| `@ApiTags('Tasks')` | Controller class | Groups endpoints under a "Tasks" section |
| `@ApiBearerAuth()` | Controller class | Marks routes as requiring JWT — shows 🔒 icon |
| `@ApiOperation({ summary })` | Route method | Human-readable description for an endpoint |
| `@ApiProperty({ example })` | DTO property | Documents a field with type, description, example |
| `@ApiProperty({ enum })` | DTO enum property | Shows all valid enum values as dropdown in UI |

### 15.3 How to use Swagger UI for testing

1. Visit `http://localhost:3000/api`
2. Hit **POST /auth/login** → Try it out → enter credentials → Execute → copy `accessToken`
3. Click the **Authorize 🔒** button → paste the token → Authorize
4. All protected routes are now unlocked — test them directly in the browser

---

## 16. Recommended Folder Architecture

NestJS uses a **feature-based architecture**. Each domain feature gets its own folder containing everything related to it.

```
src/
├── auth/
│   ├── decorators/
│   │   └── get-user.decorator.ts      # custom @GetUser() param decorator
│   ├── dto/
│   │   └── auth.dto.ts                # register/login DTO with validation
│   ├── jwt.strategy.ts                # Passport JWT strategy
│   ├── auth.controller.ts             # /auth/register  /auth/login
│   ├── auth.module.ts                 # imports UsersModule, PassportModule, JwtModule
│   └── auth.service.ts                # register() and login() logic
│
├── users/
│   ├── user.entity.ts                 # User DB table definition
│   ├── users.module.ts                # exports UsersService
│   └── users.service.ts               # createUser(), findByUsername()
│
├── tasks/
│   ├── dto/
│   │   ├── create-task.dto.ts         # CreateTaskDto with @ApiProperty
│   │   └── update-task-status.dto.ts  # UpdateTaskStatusDto
│   ├── task.entity.ts                 # Task DB table + TaskStatus enum
│   ├── tasks.controller.ts            # CRUD routes, @UseGuards, @GetUser
│   ├── tasks.module.ts                # imports TypeOrmModule.forFeature([Task])
│   └── tasks.service.ts               # all DB operations via Repository<Task>
│
├── common/                            # cross-cutting concerns (not tied to any feature)
│   ├── interceptors/
│   │   └── transform.interceptor.ts   # wraps all responses: { data, timestamp, path }
│   └── filters/
│       └── http-exception.filter.ts   # catches all errors, formats consistently
│
├── app.module.ts                      # root module — imports all feature modules
└── main.ts                            # bootstrap: global pipes, filters, interceptors, Swagger
```

---

## 17. main.ts Bootstrap & Registration Order

The order matters. This is the correct order and why:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Exception Filter — FIRST so it catches errors thrown by pipes and guards too
  app.useGlobalFilters(new AllExceptionsFilter());

  // 2. Validation Pipe — validates and transforms all incoming request data
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  // 3. Interceptor — wraps all successful responses in unified shape
  app.useGlobalInterceptors(new TransformInterceptor());

  // 4. Swagger — set up documentation UI at /api
  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  await app.listen(3000);
}
bootstrap();
```

---

## 18. Quick Reference Cheatsheet

| Concept | Decorator / Tool | One-line summary |
|---|---|---|
| Module | `@Module()` | Groups related code. Has `imports`, `providers`, `controllers`, `exports` |
| Controller | `@Controller()` | Handles HTTP routes. Thin layer — delegates to service |
| Service | `@Injectable()` | Business logic. Injected via DI. Never call `new Service()` |
| Entity | `@Entity()` | TypeScript class = database table |
| Repository | `Repository<T>` | TypeORM object for CRUD operations on an entity |
| DTO | plain class | Defines shape + validation rules for incoming request data |
| Pipe | `implements PipeTransform` | Validates and/or transforms input before handler runs |
| Guard | `implements CanActivate` | Allows or blocks a request (auth check) |
| Interceptor | `implements NestInterceptor` | Wraps handler — transforms request/response |
| Exception Filter | `implements ExceptionFilter` | Catches all errors — returns consistent error responses |
| Custom Decorator | `createParamDecorator()` | Extracts data from request into a clean reusable parameter |
| Strategy | `PassportStrategy()` | Defines HOW auth works (JWT extraction + validation) |
| ConfigService | `@nestjs/config` | Reads `.env` values anywhere in the app |
| JwtService | `@nestjs/jwt` | Signs and verifies JWT tokens |
| `forRoot()` | TypeOrmModule / ConfigModule | Global static configuration at app root |
| `forRootAsync()` | TypeOrmModule | Global config that depends on injected services (ConfigService) |
| `forFeature()` | TypeOrmModule | Registers entity repository scoped to a specific module |
| `registerAsync()` | JwtModule | Async config with injected dependencies |

# Test Sphere — Backend Instructions

> NestJS 11 + TypeORM + MySQL backend for an AI-powered exam management platform.

---

## Tech Stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Framework  | NestJS 11 (Node 18.x)                                  |
| Language   | TypeScript 5.7 (ES2017, CommonJS)                      |
| ORM        | TypeORM 0.3 (MySQL via mysql2)                         |
| Auth       | JWT (passport-jwt, 2h expiry) + OTP email verification |
| Validation | class-validator + class-transformer                    |
| Docs       | Swagger/OpenAPI at `/api`                              |
| WebSockets | Socket.io (NestJS platform-socket.io)                  |
| AI         | OpenAI SDK → OpenRouter (GPT-4o-mini)                  |
| Email      | Nodemailer (Gmail SMTP)                                |
| Upload     | ImageKit (server-side + signed client-side)            |
| Linting    | ESLint (typescript-eslint strict) + Prettier           |

---

## Project Structure

```
src/
├── main.ts                    # Bootstrap, global pipes, Swagger, CORS
├── app.module.ts              # Root module — imports all feature modules
├── app.controller.ts          # Health check endpoint
├── app.service.ts
├── config/                    # ConfigModule + ConfigService (.env loader)
├── typeorm/                   # TypeORM config, data source, entities, migrations
│   ├── data-source.ts         # CLI data source (for migrations)
│   ├── typeorm.config.ts      # Shared DB config factory
│   ├── typeorm.module.ts      # TypeORM module registration
│   ├── entities/              # All entity classes
│   └── migrations/            # TypeORM migration files
├── auth/                      # Authentication (signup, login, OTP, reset, JWT)
│   └── strategies/            # JWT strategy (passport)
├── common/                    # Shared infrastructure
│   ├── guards/                # JwtAuthGuard, UserRoleGuard, ClassRoleGuard
│   ├── decorators/            # @GetUser, @RequireUserRole, @RequireClassRole
│   ├── middleware/             # LoggerMiddleware (applied globally)
│   └── access-models/         # Access model types
├── class/                     # Class management (CRUD, join, approve, teachers)
├── test/                      # Tests, questions, question pools
├── submission/                # Submissions, grading, answer tracking
├── agent/                     # AI question generation + chat streaming
├── procotoring-log/           # Proctoring event logs (screenshots, keystrokes)
├── streaming/                 # WebRTC signaling gateway (Socket.io)
├── upload/                    # ImageKit upload + signature endpoints
└── email/                     # Transactional email service
```

---

## Commands

```bash
npm run start:dev          # Development server (watch mode)
npm run build              # Production build
npm run start:prod         # Run production build
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting
npm run migration:gen --name=MigrationName  # Generate migration
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
npm run migration:fresh    # Drop schema + regenerate + run
```

---

## Environment Variables

```env
DATABASE_URL=mysql://user:pass@host:port/dbname
JWT_SECRET=<secret-key>
OPENROUTER_API_KEY=sk-...
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<account>
SMTP_USER=<email@gmail.com>
SMTP_PASS=<app-password>
FRONTEND_URL=http://localhost:3000
PORT=5000
```

---

## Architecture Patterns

### Module Pattern

Every feature is a self-contained NestJS module with its own controller, service, DTOs, and module file. Modules register their TypeORM entities via `TypeOrmModule.forFeature([...])`.

### Dependency Injection

Services are `@Injectable()` singletons. Repositories are injected via `@InjectRepository(Entity)`.

### Global Middleware

`LoggerMiddleware` is applied to all routes in `AppModule.configure()`. Logs format:

```
{method} {url} → {statusCode} ({duration}ms)
```

### Global Validation Pipe

Configured in `main.ts`:

- `whitelist: true` — strips unknown properties
- `forbidNonWhitelisted: true` — rejects unknown properties
- `transform: true` — auto-transforms payloads to DTO instances

---

## Database Entities (11 total)

| Entity            | Key Fields                                                                                   | Notes                                            |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **User**          | email, role (TEACHER/STUDENT), firebaseId, cnic, otp                                         | Unique: email, firebaseId, cnic                  |
| **Class**         | name, code, description                                                                      | Unique: code                                     |
| **Test**          | title, classId, mode (STATIC/POOL), status (DRAFT/ACTIVE/CLOSED), config JSON                | Config: webcam, fullscreen, duration, violations |
| **Question**      | testId, questionPoolId, type (MCQ/TRUE_FALSE/SHORT/LONG), options JSON, correctAnswer        | Indexed by testId, questionPoolId                |
| **QuestionPool**  | testId, name, config JSON                                                                    | Config specifies question counts per type        |
| **Answer**        | studentId, questionId, submissionId, gradingStatus (AUTOMATIC/PENDING/GRADED), obtainedMarks | Unique: studentId + questionId                   |
| **Submission**    | studentId, testId, status (IN_PROGRESS/SUBMITTED/GRADED), startedAt, submittedAt, gradedAt   |                                                  |
| **ClassTeacher**  | teacherId, classId, role (OWNER/EDITOR/VIEWER)                                               | Composite PK                                     |
| **StudentClass**  | studentId, classId, approved                                                                 | Controls enrollment access                       |
| **ProctoringLog** | submissionId, logType (SCREENSHOT/WEBCAM_PHOTO/FOCUS_CHANGE/etc), meta JSON                  | Indexed by submissionId, logType                 |

### Transactions

Use `DataSource.createQueryRunner()` for multi-step operations:

```typescript
const qr = this.dataSource.createQueryRunner();
await qr.connect();
await qr.startTransaction();
try {
  await qr.manager.save(entity);
  await qr.commitTransaction();
} catch {
  await qr.rollbackTransaction();
} finally {
  await qr.release();
}
```

---

## Authentication & Authorization

### Auth Flow

1. **Signup** → email/password or Firebase ID → OTP sent to email → verify OTP → user verified
2. **Login** → email/password or Firebase ID → JWT issued (2h expiry)
3. **JWT payload**: `{ sub: userId, email, role }`
4. **Password reset** → OTP email → verify OTP → set new password

### Guards (applied via decorators)

| Guard            | Decorator                                            | Purpose                           |
| ---------------- | ---------------------------------------------------- | --------------------------------- |
| `JwtAuthGuard`   | `@UseGuards(JwtAuthGuard)`                           | Validates JWT Bearer token        |
| `UserRoleGuard`  | `@RequireUserRole(UserRole.TEACHER)`                 | Checks user role                  |
| `ClassRoleGuard` | `@RequireClassRole(ClassTeacherRole.EDITOR, "test")` | Checks teacher's class-level role |

### ClassRoleGuard Resolution Modes

The second parameter tells the guard how to resolve the `classId`:

- `"class"` → from `params.classId` or `body.classId`
- `"test"` → via `testId` → Test → classId FK
- `"question"` → via `questionId` → Question → Test → classId
- `"submission"` → via `submissionId` → Submission → Test → classId
- `"questionPool"` → via `poolId` → QuestionPool → Test → classId

### Custom Decorators

- `@GetUser()` / `@GetUser("id")` — extract user or user property from request
- `@RequireUserRole(...roles)` — set role metadata for `UserRoleGuard`
- `@RequireClassRole(role, mode)` — set class role metadata for `ClassRoleGuard`

---

## API Endpoints

### Auth (`/auth`)

| Method | Path                    | Auth | Description                           |
| ------ | ----------------------- | ---- | ------------------------------------- |
| POST   | `/auth/signup`          | —    | Register (email/password or Firebase) |
| POST   | `/auth/login`           | —    | Login → JWT                           |
| POST   | `/auth/verify-otp`      | —    | Verify email OTP                      |
| POST   | `/auth/resend-otp`      | —    | Resend OTP                            |
| POST   | `/auth/forgot-password` | —    | Request password reset                |
| POST   | `/auth/reset-password`  | —    | Reset with OTP                        |
| GET    | `/auth/me`              | JWT  | Current user profile                  |

### Classes (`/classes`)

| Method | Path                                    | Auth              | Description             |
| ------ | --------------------------------------- | ----------------- | ----------------------- |
| POST   | `/classes`                              | TEACHER           | Create class            |
| GET    | `/classes`                              | JWT               | List user's classes     |
| GET    | `/classes/:classId`                     | ClassRole: VIEWER | Get class details       |
| PATCH  | `/classes/:classId`                     | ClassRole: EDITOR | Update class            |
| DELETE | `/classes/:classId`                     | ClassRole: OWNER  | Delete class            |
| POST   | `/classes/:classCode/join`              | STUDENT           | Join by code            |
| POST   | `/classes/:classId/leave`               | STUDENT           | Leave class             |
| POST   | `/classes/:classId/approve`             | ClassRole: EDITOR | Approve student         |
| POST   | `/classes/:classId/remove`              | ClassRole: EDITOR | Remove student          |
| POST   | `/classes/:classId/approve-all`         | ClassRole: EDITOR | Approve all pending     |
| POST   | `/classes/:classId/reject-all`          | ClassRole: EDITOR | Reject all pending      |
| GET    | `/classes/:classId/inviteable-teachers` | ClassRole: OWNER  | List teachers to invite |
| POST   | `/classes/:classId/teachers/:teacherId` | ClassRole: OWNER  | Invite teacher          |

### Tests (`/tests`)

| Method | Path                           | Auth                             | Description                      |
| ------ | ------------------------------ | -------------------------------- | -------------------------------- |
| POST   | `/tests`                       | ClassRole: EDITOR                | Create test                      |
| GET    | `/tests/:testId`               | JWT                              | Get test                         |
| GET    | `/tests/class/:classId`        | JWT                              | List tests for class             |
| PATCH  | `/tests/:testId`               | ClassRole: EDITOR (test)         | Update test                      |
| PATCH  | `/tests/:testId/config`        | ClassRole: EDITOR (test)         | Update test config               |
| DELETE | `/tests/:testId`               | ClassRole: EDITOR (test)         | Delete test                      |
| GET    | `/tests/:testId/invigilate`    | ClassRole: VIEWER (test)         | Get active students              |
| GET    | `/tests/:testId/questions`     | JWT                              | Get questions (mode query param) |
| POST   | `/tests/:testId/questions`     | ClassRole: EDITOR (test)         | Add questions                    |
| PATCH  | `/tests/questions/:questionId` | ClassRole: EDITOR (question)     | Update question                  |
| DELETE | `/tests/questions/:questionId` | ClassRole: EDITOR (question)     | Delete question                  |
| POST   | `/tests/:testId/pools`         | ClassRole: EDITOR (test)         | Create pool                      |
| PATCH  | `/tests/pools/:poolId`         | ClassRole: EDITOR (questionPool) | Update pool                      |
| PATCH  | `/tests/pools`                 | ClassRole: EDITOR                | Bulk update pools                |
| DELETE | `/tests/pools/:poolId`         | ClassRole: EDITOR (questionPool) | Delete pool                      |

### Submissions (`/submissions`)

| Method | Path                                | Auth                           | Description              |
| ------ | ----------------------------------- | ------------------------------ | ------------------------ |
| POST   | `/submissions/start`                | STUDENT                        | Start test               |
| POST   | `/submissions/submit`               | STUDENT                        | Submit answers           |
| POST   | `/submissions/:submissionId/grade`  | ClassRole: OWNER (submission)  | Grade submission         |
| PATCH  | `/submissions/:submissionId/status` | ClassRole: OWNER (submission)  | Update status            |
| GET    | `/submissions/test/:testId`         | ClassRole: VIEWER (test)       | Get submissions for test |
| GET    | `/submissions/student`              | STUDENT                        | Get own submissions      |
| GET    | `/submissions/:submissionId`        | ClassRole: VIEWER (submission) | Get submission detail    |
| DELETE | `/submissions/:submissionId`        | ClassRole: OWNER (submission)  | Delete submission        |

### Agent (`/agent`)

| Method | Path                            | Auth | Description                  |
| ------ | ------------------------------- | ---- | ---------------------------- |
| POST   | `/agent/stream`                 | JWT  | Stream AI chat response      |
| POST   | `/agent/generate-questions/ask` | JWT  | Generate questions from text |
| POST   | `/agent/generate-questions/pdf` | JWT  | Generate questions from PDF  |

### Proctoring Logs (`/proctoring-logs`)

| Method | Path                             | Auth                           | Description    |
| ------ | -------------------------------- | ------------------------------ | -------------- |
| POST   | `/proctoring-logs`               | STUDENT                        | Add single log |
| POST   | `/proctoring-logs/batch`         | STUDENT                        | Add batch logs |
| GET    | `/proctoring-logs/:submissionId` | ClassRole: VIEWER (submission) | Get logs       |
| DELETE | `/proctoring-logs/:submissionId` | ClassRole: OWNER (submission)  | Delete logs    |

### Upload (`/upload`)

| Method | Path                | Auth | Description                    |
| ------ | ------------------- | ---- | ------------------------------ |
| GET    | `/upload/signature` | JWT  | ImageKit client-side signature |
| POST   | `/upload`           | JWT  | Server-side upload to ImageKit |

---

## Coding Conventions

### Naming

| Element    | Convention                          | Example                                  |
| ---------- | ----------------------------------- | ---------------------------------------- |
| Files      | `kebab-case` + `.type.ts`           | `class-role.guard.ts`, `jwt.strategy.ts` |
| Classes    | PascalCase                          | `TestService`, `ClassRoleGuard`          |
| DTOs       | PascalCase + `Dto` suffix           | `CreateTestDto`, `UpdateClassDto`        |
| Methods    | camelCase                           | `getTestById()`, `verifyOtp()`           |
| Constants  | UPPER_SNAKE_CASE                    | `USER_ROLE_KEY`, `CLASS_ROLE_KEY`        |
| Enums      | PascalCase enum, UPPER_SNAKE values | `UserRole.TEACHER`, `TestStatus.ACTIVE`  |
| DB columns | snake_case (TypeORM convention)     | `class_teacher`, `student_class`         |

### DTO Validation

Use `class-validator` decorators on all DTO properties:

```typescript
@IsEmail()
@IsString()
@IsInt()
@IsEnum(SomeEnum)
@ValidateNested()
@ValidateIf(obj => condition)  // Conditional
@Transform()                    // Data transformation
@Type(() => SomeClass)          // Nested type
```

### Error Handling

Use NestJS built-in HTTP exceptions:

```typescript
throw new NotFoundException("User not found");
throw new BadRequestException("Invalid OTP");
throw new ConflictException("Email already registered");
throw new ForbiddenException("Access denied: insufficient role");
throw new UnauthorizedException("Invalid credentials");
throw new ServiceUnavailableException("API key not configured");
```

### Swagger Documentation

Annotate all controllers and endpoints:

```typescript
@ApiTags("tests")
@ApiBearerAuth()
@ApiOperation({ summary: "Create a new test" })
@ApiResponse({ status: 201, description: "Test created" })
```

### Path Alias

- `@config/*` → `./src/config/*` (tsconfig paths)

---

## Key Business Logic

### Test Modes

- **STATIC**: All questions are shown to every student in order.
- **POOL**: Questions are randomly selected from question pools per type. Each pool specifies how many questions of each type (MCQ, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER) to draw.

### Auto-Grading

- **MCQ / TRUE_FALSE**: Graded automatically by matching `correctAnswer`. Status → `AUTOMATIC`.
- **SHORT_ANSWER / LONG_ANSWER**: Status → `PENDING` for teacher manual review.

### AI Question Generation

1. Accepts text prompt or PDF upload.
2. Calls OpenRouter GPT-4o-mini with a structured JSON schema.
3. Parses response, shuffles MCQ options (Fisher-Yates), sorts by type.
4. Returns generated questions for teacher review before adding to test.

### WebSocket Streaming

- Gateway namespace: `/streaming`
- Events: `register`, `start-stream`, `signal`, `stop-stream`
- Implements WebRTC signaling (offer/answer/ICE candidates) for live proctoring.

---

## TypeScript Configuration

- **Target**: ES2017
- **Module**: CommonJS
- **strictNullChecks**: enabled
- **emitDecoratorMetadata**: enabled
- **experimentalDecorators**: enabled
- **noImplicitAny**: disabled

## ESLint Configuration

- Extends: `eslint:recommended`, `typescript-eslint/recommendedTypeChecked`, `prettier`
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-floating-promises`: warn
- `@typescript-eslint/no-unsafe-argument`: warn

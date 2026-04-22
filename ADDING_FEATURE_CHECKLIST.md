# Adding a Backend Feature

This is the coding flow for implementing backend functionality in this repo.

Use this when you add a new model, new endpoint, or new database-backed feature.

## The Short Version

If you add something like a `User` model, the normal order is:

1. Update `schema.prisma`
2. Run Prisma sync and generate
3. Add Pydantic request/response schemas
4. Add Prisma queries in `services/`
5. Add business logic in `controllers/`
6. Add endpoints in `routes/`
7. Make sure `main.py` includes the router
8. Run the app and test the endpoint

The feature is finished when a request can go end-to-end:

HTTP request -> route -> controller -> service -> Prisma -> database -> response

## Directory Roles

- [schema.prisma](/home/cal/Frontend/backend/schema.prisma): database structure
- [app/config/](/home/cal/Frontend/backend/app/config): settings and env loading
- [app/db.py](/home/cal/Frontend/backend/app/db.py): shared Prisma client
- [app/schemas/](/home/cal/Frontend/backend/app/schemas): API input/output models
- [app/services/](/home/cal/Frontend/backend/app/services): database queries
- [app/controllers/](/home/cal/Frontend/backend/app/controllers): business rules
- [app/routes/](/home/cal/Frontend/backend/app/routes): HTTP endpoints
- [main.py](/home/cal/Frontend/backend/main.py): app startup and router registration

## Exact File Order To Open

If you are building a new feature from scratch, open files in this order:

1. [schema.prisma](/home/cal/Frontend/backend/schema.prisma)
2. [app/schemas/user_schemas.py](/home/cal/Frontend/backend/app/schemas/user_schemas.py)
3. [app/services/user_service.py](/home/cal/Frontend/backend/app/services/user_service.py)
4. [app/controllers/user_controller.py](/home/cal/Frontend/backend/app/controllers/user_controller.py)
5. [app/routes/users.py](/home/cal/Frontend/backend/app/routes/users.py)
6. [main.py](/home/cal/Frontend/backend/main.py)

If the feature already has a router in `main.py`, you may not need to touch `main.py`.

## Example: Add a `User` Feature

### Step 1. Define the model

Start here:

- [schema.prisma](/home/cal/Frontend/backend/schema.prisma)

Example:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      String   @default("patient")
  createdAt DateTime @default(now())
}
```

This file only defines the database shape.

It does not define:

- request bodies
- response bodies
- business rules
- API endpoints

### Step 2. Sync Prisma

After editing the schema, run:

```bash
cd /home/cal/Frontend/backend
venv/bin/python -m prisma db push
venv/bin/python -m prisma generate
```

What this does:

- `db push`: updates the actual database
- `generate`: updates the Python Prisma client

If you skip `generate`, your code will not be able to use the new model properly.

### Step 3. Define API payload models

Go to:

- [app/schemas/user_schemas.py](/home/cal/Frontend/backend/app/schemas/user_schemas.py)

This file is for Pydantic models such as:

- `UserCreate`
- `UserResponse`
- `UserUpdate`

This is where you define:

- what the API accepts
- what the API returns

This is not the database layer.

Example responsibilities:

- `UserCreate`: what the frontend sends to create a user
- `UserResponse`: what the API sends back after creating or fetching a user

### Step 4. Write Prisma queries

Go to:

- [app/services/user_service.py](/home/cal/Frontend/backend/app/services/user_service.py)

This is where Prisma queries belong.

Examples:

- get user by email
- create user
- list users
- get user by id
- update user
- delete user

Typical code shape:

```python
await db.user.find_unique(...)
await db.user.find_many(...)
await db.user.create(...)
await db.user.update(...)
await db.user.delete(...)
```

Rule:

- `services/` talks to the database
- `services/` should not deal with HTTP request/response concerns

Also, prefer importing the client from:

```python
from app.db import db
```

not from `main.py`.

### Step 5. Add business logic

Go to:

- [app/controllers/user_controller.py](/home/cal/Frontend/backend/app/controllers/user_controller.py)

This layer decides how the feature behaves.

Examples:

- check if email already exists
- decide whether to return `404`
- decide whether to return `400`
- call background tasks
- combine multiple service calls into one use case

Rule:

- `controllers/` coordinates the work
- `controllers/` decides app behavior
- `controllers/` does not usually contain raw Prisma queries

### Step 6. Expose the endpoint

Go to:

- [app/routes/users.py](/home/cal/Frontend/backend/app/routes/users.py)

This is where the HTTP endpoint lives.

Examples:

- `POST /api/users/`
- `GET /api/users/`
- `GET /api/users/{user_id}`
- `DELETE /api/users/{user_id}`

Rule:

- `routes/` should stay thin
- route functions call controller functions
- route functions should not hold database logic

### Step 7. Register the router

Check:

- [main.py](/home/cal/Frontend/backend/main.py)

Make sure the router is included:

```python
from app.routes import users
app.include_router(users.router)
```

If the router is already registered, there is nothing else to do here.

### Step 8. Run and test

Run the app:

```bash
cd /home/cal/Frontend/backend
venv/bin/python main.py
```

Then test the endpoint in:

- Swagger UI: `http://localhost:8000/docs`

For a `create user` feature, the feature is implemented when:

1. The route accepts the request body
2. The controller validates the behavior
3. The service writes to the database
4. Prisma returns the new record
5. The API responds correctly

## Where To Start Depending On The Change

### If you add a brand new table/model

Start in:

- [schema.prisma](/home/cal/Frontend/backend/schema.prisma)

Then continue through:

- `app/schemas/`
- `app/services/`
- `app/controllers/`
- `app/routes/`

### If you add a new endpoint on an existing model

Start in:

- `app/routes/`

Then fill in:

- `app/controllers/`
- `app/services/`

Only touch `schema.prisma` if the database structure must change.

### If you add a new database query only

Start in:

- `app/services/`

Then update controller and route only if the query needs to be exposed through HTTP.

### If you change validation or response shape only

Start in:

- `app/schemas/`

Then update controller/route as needed.

## What Counts As "Done"

A backend feature is done when all of these are true:

1. The Prisma schema matches the data you need
2. Prisma has been generated successfully
3. The service can perform the DB operation
4. The controller handles the business rule correctly
5. The route exposes the functionality
6. The router is registered
7. The endpoint works in `/docs` or through a real request

## Fast Mental Model

Use this sentence:

"Schema defines it, service queries it, controller decides it, route exposes it."

If you keep that separation clean, the codebase stays manageable.

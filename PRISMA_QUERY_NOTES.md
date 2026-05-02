# Prisma Query Notes


## 1. What Prisma Is Doing Here

In this project, Prisma sits between your Python app and the database.

You define tables in [schema.prisma](/home/cal/Frontend/backend/schema.prisma), then Prisma generates a Python client. Your app uses that client with calls like:

```python
await db.user.find_unique(...)
await db.user.find_many(...)
await db.user.create(...)
await db.user.update(...)
await db.user.delete(...)
```

Current datasource:

- Database: PostgreSQL
- Prisma client: `prisma-client-py`
- Interface: async

## 2. Query Prerequisites

Before queries work, Prisma must be generated:

```bash
cd /home/cal/Frontend/backend
venv/bin/python -m prisma generate
```

If the database schema changed, also sync the DB:

```bash
cd /home/cal/Frontend/backend
venv/bin/python -m prisma db push
venv/bin/python -m prisma generate
```

Typical client import in this repo:

```python
from app.db import db
```

Examples below assume:

```python
from app.db import db
```

## 3. Current Prisma Model

Right now your actual schema only contains `User`:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      String   @default("patient")
  createdAt DateTime @default(now())
}
```

That means every real query in the current app is against `db.user`.

## 4. Prisma Query Shape

Most Prisma queries follow the same pattern:

```python
await db.<model>.<action>(
    where={...},
    data={...},
    include={...},
    order_by={...},
    skip=...,
    take=...,
)
```

Common pieces:

- `where`: filter records
- `data`: values to create or update
- `include`: load related records too
- `order_by`: sort results
- `skip`: offset for pagination
- `take`: limit for pagination

## 5. User Queries You Already Need

### Create a user

```python
await db.user.create(
    data={
        "email": "alice@example.com",
        "name": "Alice",
        "role": "patient",
    }
)
```

What it does:

- Inserts one row into `User`
- Uses schema defaults if fields are omitted
- Fails if `email` already exists because `email` is unique

### Find a user by ID

```python
await db.user.find_unique(where={"id": 1})
```

Use when:

- Looking up one exact row by a unique field
- Fetching a user details page

### Find a user by email

```python
await db.user.find_unique(where={"email": "alice@example.com"})
```

Use when:

- Checking whether a signup email already exists
- Looking up a login/account record

### Get all users

```python
await db.user.find_many()
```

Use when:

- Admin list page
- Back-office exports

### Get only patients

```python
await db.user.find_many(where={"role": "patient"})
```

### Get only clinicians

```python
await db.user.find_many(where={"role": "clinician"})
```

### Get only admins

```python
await db.user.find_many(where={"role": "admin"})
```

### Sort users by newest first

```python
await db.user.find_many(order_by={"createdAt": "desc"})
```

Useful for:

- Recent signups
- Admin dashboards

### Paginate users

```python
await db.user.find_many(
    order_by={"createdAt": "desc"},
    skip=0,
    take=20,
)
```

Second page example:

```python
await db.user.find_many(
    order_by={"createdAt": "desc"},
    skip=20,
    take=20,
)
```

### Search users by partial name

```python
await db.user.find_many(
    where={
        "name": {
            "contains": "ali",
        }
    }
)
```

### Search users by email prefix

```python
await db.user.find_many(
    where={
        "email": {
            "startswith": "admin",
        }
    }
)
```

### Search users with multiple conditions

```python
await db.user.find_many(
    where={
        "AND": [
            {"role": "clinician"},
            {"email": {"contains": "@hospital.com"}},
        ]
    }
)
```

### Search users with OR conditions

```python
await db.user.find_many(
    where={
        "OR": [
            {"role": "admin"},
            {"role": "clinician"},
        ]
    }
)
```

### Count users

```python
await db.user.count()
```

### Count only patients

```python
await db.user.count(where={"role": "patient"})
```

### Update one user

```python
await db.user.update(
    where={"id": 1},
    data={
        "name": "Alice Smith",
        "role": "admin",
    },
)
```

Use when:

- Promoting a user to admin
- Updating profile details

### Update many users at once

```python
await db.user.update_many(
    where={"role": "patient"},
    data={"role": "clinician"},
)
```

Use with care. This is a bulk operation.

### Delete one user

```python
await db.user.delete(where={"id": 1})
```

### Delete many users

```python
await db.user.delete_many(where={"role": "admin"})
```

This is dangerous in production. Usually you want a softer pattern such as an `isActive` or `deletedAt` field instead of hard deletes.

### Upsert a user

Upsert means:

- update if the record exists
- create it if it does not

```python
await db.user.upsert(
    where={"email": "alice@example.com"},
    data={
        "create": {
            "email": "alice@example.com",
            "name": "Alice",
            "role": "patient",
        },
        "update": {
            "name": "Alice Smith",
        },
    },
)
```

Useful for:

- Sync jobs
- Idempotent account creation
- External auth user sync

### Create many users

```python
await db.user.create_many(
    data=[
        {"email": "a@example.com", "name": "A", "role": "patient"},
        {"email": "b@example.com", "name": "B", "role": "clinician"},
    ]
)
```

Useful for:

- Seed scripts
- Bulk imports

## 6. Query Patterns You Will Need for a Healthcare Platform

Right now the repo only has `User`, but the schema comments already hint at future appointment relations. These are the next patterns you will almost certainly need.

The examples below assume you later add models such as:

- `Appointment`
- `MedicalRecord`
- `Prescription`

The point here is to show the Prisma query shape, not to lock you into an exact schema today.

## 7. Appointment Query Patterns

### Create an appointment

Example idea:

```python
await db.appointment.create(
    data={
        "date": appointment_dt,
        "notes": "Initial consultation",
        "user": {
            "connect": {"id": 1}
        },
    }
)
```

Use when:

- Booking a patient visit
- Scheduling an intake call

### List all appointments for one user

```python
await db.appointment.find_many(
    where={"userId": 1},
    order_by={"date": "asc"},
)
```

### Get upcoming appointments only

```python
await db.appointment.find_many(
    where={
        "userId": 1,
        "date": {"gte": now_dt},
    },
    order_by={"date": "asc"},
)
```

### Get past appointments

```python
await db.appointment.find_many(
    where={
        "userId": 1,
        "date": {"lt": now_dt},
    },
    order_by={"date": "desc"},
)
```

### Check whether a user already has an appointment at a time

```python
await db.appointment.find_first(
    where={
        "userId": 1,
        "date": appointment_dt,
    }
)
```

Use when:

- Preventing duplicate bookings
- Detecting slot collisions

### Update an appointment

```python
await db.appointment.update(
    where={"id": 10},
    data={
        "date": new_dt,
        "notes": "Rescheduled visit",
    },
)
```

### Cancel or mark an appointment

If you later add a `status` field:

```python
await db.appointment.update(
    where={"id": 10},
    data={"status": "cancelled"},
)
```

That is better than deleting rows if you want audit history.

## 8. Relation Queries

Relations are where Prisma gets really useful.

### Get one user and include their appointments

```python
await db.user.find_unique(
    where={"id": 1},
    include={"appointments": True},
)
```

### Get one user and only upcoming appointments

```python
await db.user.find_unique(
    where={"id": 1},
    include={
        "appointments": {
            "where": {
                "date": {"gte": now_dt},
            }
        }
    },
)
```

### Create a user and nested related data

If your schema later supports nested writes:

```python
await db.user.create(
    data={
        "email": "patient@example.com",
        "name": "New Patient",
        "role": "patient",
        "appointments": {
            "create": [
                {
                    "date": appointment_dt,
                    "notes": "Onboarding visit",
                }
            ]
        },
    }
)
```

## 9. Search and Filtering Patterns

These patterns show up everywhere in platform work.

### Exact match

```python
where={"role": "patient"}
```

### Partial text search

```python
where={"name": {"contains": "sam"}}
```

### Prefix match

```python
where={"email": {"startswith": "support"}}
```

### Value in a set

```python
where={"role": {"in": ["patient", "clinician"]}}
```

### Date range

```python
where={
    "createdAt": {
        "gte": start_dt,
        "lte": end_dt,
    }
}
```

### Negation

```python
where={"role": {"not": "admin"}}
```

### AND logic

```python
where={
    "AND": [
        {"role": "clinician"},
        {"createdAt": {"gte": start_dt}},
    ]
}
```

### OR logic

```python
where={
    "OR": [
        {"name": {"contains": "sam"}},
        {"email": {"contains": "sam"}},
    ]
}
```

## 10. Dashboard Queries

These are common backend queries for admin pages.

### Total users

```python
await db.user.count()
```

### Total clinicians

```python
await db.user.count(where={"role": "clinician"})
```

### New users in a date window

```python
await db.user.find_many(
    where={
        "createdAt": {
            "gte": start_dt,
            "lte": end_dt,
        }
    },
    order_by={"createdAt": "desc"},
)
```

### Recent signups

```python
await db.user.find_many(
    order_by={"createdAt": "desc"},
    take=10,
)
```

## 11. Transactions

Use a transaction when multiple writes must succeed or fail together.

Example:

- create appointment
- create audit log
- reserve a slot

Shape:

```python
async with db.tx() as tx:
    appointment = await tx.appointment.create(
        data={
            "date": appointment_dt,
            "user": {"connect": {"id": 1}},
        }
    )

    await tx.auditlog.create(
        data={
            "action": "appointment_created",
            "entityId": appointment.id,
        }
    )
```

If one query fails, the transaction rolls back.

## 12. Common Query Decisions

### `find_unique()` vs `find_first()`

Use `find_unique()` when:

- the field is unique in the schema
- examples: `id`, `email`

Use `find_first()` when:

- you want the first row matching a non-unique filter
- example: first upcoming appointment for a patient

### `delete()` vs status update

Use `delete()` when:

- the row should really disappear

Use a status field like `"cancelled"` when:

- you need history
- you need auditability
- the record matters for reports later

For healthcare data, status updates are usually safer than hard deletes.

### `find_many()` vs `count()`

Use `find_many()` when:

- you need the actual rows

Use `count()` when:

- you only need the number

`count()` is cheaper than loading records just to measure them.

## 13. Repo-Specific Notes

### Use the shared DB client

This repo already has [app/db.py](/home/cal/Frontend/backend/app/db.py), which is the right home for the Prisma client.

Prefer:

```python
from app.db import db
```

over importing `db` from `main.py`.

### Current app queries

The current user service already follows the basic patterns:

- get by email
- create
- list all
- get by id
- delete by id

See [user_service.py](/home/cal/Frontend/backend/app/services/user_service.py).

## 14. Good Next Models for This Platform

If you continue this healthcare platform, the next useful models are probably:

1. `Appointment`
2. `ClinicianProfile`
3. `PatientProfile`
4. `MedicalRecord`
5. `Prescription`
6. `AuditLog`

Once those exist, Prisma query usage stays the same. The main change is that you start using more:

- `include`
- nested `create`
- `connect`
- relational `where`
- transactions

## 15. Fast Mental Shortcut

When writing a Prisma query, think:

1. What model am I targeting?
2. Am I reading, creating, updating, or deleting?
3. Do I need one row or many?
4. Do I need a filter in `where`?
5. Do I need related rows in `include`?
6. Do I need sorting or pagination?



# Healthcare Platform Backend

FastAPI backend with Prisma Client for Python

## Setup Instructions

Use Python 3.12+ for local development. The dependency set in this repo is compatible with current interpreters, but older cached installs of `pydantic` may fail on Python 3.14 because they try to build an outdated `pydantic-core` release from source.

### 1. Create Virtual Environment
```bash
python3 -m venv venv
```

If you're using `fish`, activate it with:

```fish
source venv/bin/activate.fish
```

For bash/zsh, use:

```bash
source venv/bin/activate
```

### 2. Install Dependencies
```bash
venv/bin/python -m pip install --upgrade pip
venv/bin/pip install -r requirements.txt
```

If the environment is already active, `python -m pip install -r requirements.txt` also works.

### 3. Initialize Prisma
```bash
prisma db push  # This will create the database based on schema.prisma
prisma generate  # Generate Prisma Client
```

### 4. Run the Server
```bash
venv/bin/python main.py
```

Or using uvicorn directly:
```bash
venv/bin/uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## Project Structure

```
backend/
├── app/
│   ├── config/          # Configuration/Environment files (.env setups)
│   ├── controllers/     # Orchestrates HTTP requests, calls Services, handles HTTP Exceptions
│  
│   ├── routes/          # API endpoint URL definitions (think: the steering wheel)
│   ├── schemas/         # Data validation using Pydantic classes
│   ├── services/        # Pure Business Logic and Database Interactions (the engine)
│   └── workers/         # Background tasks (Emails, PDF generation, Heavy jobs)
├── main.py              # FastAPI app entry point
├── schema.prisma        # Prisma database schema
├── .env                 # Environment variables
└── requirements.txt     # Python dependencies
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Adding Models

1. Define your models in `schema.prisma`
2. Run `prisma db push` to apply changes
3. Run `prisma generate` to update Prisma Client

## CORS Configuration

Frontend URLs are configured in `main.py`. Update the `allow_origins` list with your frontend URLs.

## Common Commands

- `prisma studio` - Open Prisma Studio (visual database browser)
- `prisma migrate dev --name <migration_name>` - Create and apply migrations
- `prisma db seed` - Run seed scripts

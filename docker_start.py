"""Docker startup helper.

Applies pending Prisma migrations, seeds an empty database once, then starts the API.
Existing databases are left untouched.
"""

import asyncio
import os
import subprocess
import sys

from app.db import db


async def database_is_empty() -> bool:
    await db.connect()
    try:
        return await db.user.count() == 0
    finally:
        await db.disconnect()


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    print("Applying pending Prisma migrations...")
    run(["prisma", "migrate", "deploy"])

    if asyncio.run(database_is_empty()):
        print("Database is empty. Running seed_data.py...")
        run([sys.executable, "seed_data.py"])
    else:
        print("Database already contains users. Skipping seed.")

    print("Starting FastAPI...")
    os.execvp(
        "uvicorn",
        ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
    )


if __name__ == "__main__":
    main()

# `app/db.py`
# This file is responsible for ONE thing: creating the Prisma client instance.
# We keep it here (instead of inside `main.py`) to avoid circular imports.
#
# Why circular imports happen:
# - `main.py` imports routers
# - routers import controllers
# - controllers import services
# - services need a `db` client
# If the service imports `db` from `main.py`, Python loops forever trying to load `main.py` again.
#
# So: everyone imports `db` from THIS file.

from prisma import Prisma

# This is the Prisma client used throughout the app.
# You connect/disconnect it in `main.py` using the FastAPI lifespan.
db = Prisma()

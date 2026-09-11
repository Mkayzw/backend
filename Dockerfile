FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY schema.prisma ./schema.prisma
RUN prisma generate

COPY main.py ./main.py
COPY seed_data.py ./seed_data.py
COPY docker_start.py ./docker_start.py
COPY app ./app
COPY migrations ./migrations

EXPOSE 8000

CMD ["python", "docker_start.py"]

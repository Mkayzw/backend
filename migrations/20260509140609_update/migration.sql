-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "assignedToClinicianId" INTEGER,
ADD COLUMN     "lastActionAt" TIMESTAMP(3),
ADD COLUMN     "lastActionByUserId" INTEGER,
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "snoozedUntil" TIMESTAMP(3),
ADD COLUMN     "status" "AlertStatus" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "assignedClinicianId" INTEGER NOT NULL,
    "createdFromAlertId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_patientId_idx" ON "Task"("patientId");

-- CreateIndex
CREATE INDEX "Task_assignedClinicianId_idx" ON "Task"("assignedClinicianId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_assignedToClinicianId_idx" ON "Alert"("assignedToClinicianId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignedToClinicianId_fkey" FOREIGN KEY ("assignedToClinicianId") REFERENCES "Clinician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_lastActionByUserId_fkey" FOREIGN KEY ("lastActionByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedClinicianId_fkey" FOREIGN KEY ("assignedClinicianId") REFERENCES "Clinician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdFromAlertId_fkey" FOREIGN KEY ("createdFromAlertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

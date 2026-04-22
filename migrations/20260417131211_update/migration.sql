/*
  Warnings:

  - You are about to drop the column `fullname` on the `Clinician` table. All the data in the column will be lost.
  - You are about to drop the `Assignments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fullName` to the `Clinician` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('FIRST_TIME', 'RECURRING', 'CHRONIC');

-- CreateEnum
CREATE TYPE "CareContext" AS ENUM ('ASTHMA_FOLLOWUP', 'POST_SURGERY_RECOVERY', 'CHRONIC_DISEASE_MONITORING', 'INFECTION_FOLLOWUP', 'GENERAL_REVIEW');

-- DropForeignKey
ALTER TABLE "Assignments" DROP CONSTRAINT "Assignments_clinicianId_fkey";

-- DropForeignKey
ALTER TABLE "Assignments" DROP CONSTRAINT "Assignments_patientId_fkey";

-- AlterTable
ALTER TABLE "Clinician" DROP COLUMN "fullname",
ADD COLUMN     "fullName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "baselineStatus" TEXT,
ADD COLUMN     "chronicConditions" TEXT,
ADD COLUMN     "lastReportTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SymptomReport" ADD COLUMN     "durationDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "frequency" "Frequency" NOT NULL DEFAULT 'FIRST_TIME',
ADD COLUMN     "heartRate" INTEGER,
ADD COLUMN     "medicationAdherent" BOOLEAN,
ADD COLUMN     "riskExplanation" TEXT,
ADD COLUMN     "severity" "Severity" NOT NULL DEFAULT 'MILD',
ADD COLUMN     "symptoms" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "temperature" DOUBLE PRECISION,
ALTER COLUMN "notes" DROP NOT NULL;

-- DropTable
DROP TABLE "Assignments";

-- DropEnum
DROP TYPE "Status";

-- CreateTable
CREATE TABLE "Assignment" (
    "id" SERIAL NOT NULL,
    "clinicianId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "endedAt" TIMESTAMP(3),
    "careContext" "CareContext" NOT NULL DEFAULT 'GENERAL_REVIEW',
    "reason" TEXT,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_patientId_clinicianId_idx" ON "Assignment"("patientId", "clinicianId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

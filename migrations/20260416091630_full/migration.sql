-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'CLINICIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TrendStatus" AS ENUM ('IMPROVING', 'STABLE', 'WORSENING');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PATIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "currentTrendStatus" "TrendStatus" NOT NULL DEFAULT 'STABLE',
    "lastRiskUpdate" TIMESTAMP(3),
    "lastTrendUpdate" TIMESTAMP(3),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinician" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fullname" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,

    CONSTRAINT "Clinician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignments" (
    "id" SERIAL NOT NULL,
    "clinicianId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "Status" NOT NULL,

    CONSTRAINT "Assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomReport" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "riskFactors" TEXT,

    CONSTRAINT "SymptomReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "symptomReportId" INTEGER NOT NULL,
    "priority" "AlertPriority" NOT NULL,
    "alertType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Clinician_userId_key" ON "Clinician"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignments_patientId_clinicianId_key" ON "Assignments"("patientId", "clinicianId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinician" ADD CONSTRAINT "Clinician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignments" ADD CONSTRAINT "Assignments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignments" ADD CONSTRAINT "Assignments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomReport" ADD CONSTRAINT "SymptomReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_symptomReportId_fkey" FOREIGN KEY ("symptomReportId") REFERENCES "SymptomReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

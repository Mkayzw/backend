-- CreateTable
CREATE TABLE "FollowUpResponse" (
    "id" SERIAL NOT NULL,
    "symptomReportId" INTEGER NOT NULL,
    "clinicianId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpResponse_symptomReportId_idx" ON "FollowUpResponse"("symptomReportId");
CREATE INDEX "FollowUpResponse_patientId_idx" ON "FollowUpResponse"("patientId");
CREATE INDEX "FollowUpResponse_clinicianId_idx" ON "FollowUpResponse"("clinicianId");

-- AddForeignKey
ALTER TABLE "FollowUpResponse" ADD CONSTRAINT "FollowUpResponse_symptomReportId_fkey" FOREIGN KEY ("symptomReportId") REFERENCES "SymptomReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpResponse" ADD CONSTRAINT "FollowUpResponse_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpResponse" ADD CONSTRAINT "FollowUpResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "FollowUpAppointment" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "clinicianId" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpAppointment_patientId_idx" ON "FollowUpAppointment"("patientId");
CREATE INDEX "FollowUpAppointment_clinicianId_idx" ON "FollowUpAppointment"("clinicianId");
CREATE INDEX "FollowUpAppointment_scheduledAt_idx" ON "FollowUpAppointment"("scheduledAt");
CREATE INDEX "FollowUpAppointment_status_idx" ON "FollowUpAppointment"("status");

-- AddForeignKey
ALTER TABLE "FollowUpAppointment" ADD CONSTRAINT "FollowUpAppointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpAppointment" ADD CONSTRAINT "FollowUpAppointment_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.schemas.followup_schema import (
    CreateFollowUpAppointmentRequest,
    FollowUpAppointmentOut,
    UpdateFollowUpAppointmentRequest,
)
from app.services import followup_appointment_service as service
from app.services.auth import getCurrentUser, requireRole

router = APIRouter(prefix="/api/followup-appointments", tags=["Follow-Up Appointments"])


@router.post("/", response_model=FollowUpAppointmentOut, status_code=201)
async def create_appointment(
    payload: CreateFollowUpAppointmentRequest,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
):
    return await service.createAppointment(
        current_user=current_user,
        patientId=payload.patientId,
        scheduledAt=payload.scheduledAt,
        reason=payload.reason,
        clinicianId=payload.clinicianId,
    )


@router.get("/", response_model=List[FollowUpAppointmentOut])
async def list_appointments(
    patientId: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="SCHEDULED | COMPLETED | CANCELLED | MISSED"),
    upcoming: bool = Query(False, description="Only future SCHEDULED appointments"),
    current_user: dict = Depends(getCurrentUser),
):
    return await service.listAppointments(
        current_user=current_user,
        patientId=patientId,
        status_filter=status,
        upcoming_only=upcoming,
    )


@router.patch("/{appointmentId}", response_model=FollowUpAppointmentOut)
async def update_appointment(
    appointmentId: int,
    payload: UpdateFollowUpAppointmentRequest,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
):
    return await service.updateAppointment(
        appointmentId=appointmentId,
        current_user=current_user,
        scheduledAt=payload.scheduledAt,
        reason=payload.reason,
        status_value=payload.status,
    )

from typing import List

from fastapi import APIRouter, Depends

from app.schemas.followup_schema import (
    CreateFollowUpResponseRequest,
    FollowUpResponseOut,
)
from app.services import followup_response_service as service
from app.services.auth import getCurrentUser, requireRole

router = APIRouter(prefix="/api/followup-responses", tags=["Follow-Up Responses"])


@router.post("/", response_model=FollowUpResponseOut, status_code=201)
async def create_followup_response(
    payload: CreateFollowUpResponseRequest,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
):
    return await service.createFollowUpResponse(
        current_user=current_user,
        symptomReportId=payload.symptomReportId,
        message=payload.message,
        actionRequired=payload.actionRequired,
    )


@router.get("/report/{symptomReportId}", response_model=List[FollowUpResponseOut])
async def list_responses_for_report(
    symptomReportId: int,
    current_user: dict = Depends(getCurrentUser),
):
    return await service.listResponsesForReport(
        symptomReportId=symptomReportId, current_user=current_user
    )


@router.get("/patient/{patientId}", response_model=List[FollowUpResponseOut])
async def list_responses_for_patient(
    patientId: int,
    current_user: dict = Depends(getCurrentUser),
):
    return await service.listResponsesForPatient(
        patientId=patientId, current_user=current_user
    )

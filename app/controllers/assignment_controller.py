from fastapi import HTTPException
from app.services import assignment as assignmentService
from app.services import patient as patientService
from app.services import clinician as clinicianService
from app.schemas.assignment_schema import CreateAssignment, UpdateAssignmentStatus


async def createAssignment(payload: CreateAssignment):
    # Verify patient exists
    patient = await patientService.getPatientbyId(payload.patientId)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Verify clinician exists
    clinician = await clinicianService.getClinicianById(payload.clinicianId)
    if not clinician:
        raise HTTPException(status_code=404, detail="Clinician not found")

    # Enforce active-only uniqueness (no DB constraint; enforced here)
    existing_active = await assignmentService.checkActiveAssignmentExists(
        payload.patientId, payload.clinicianId
    )
    if existing_active:
        raise HTTPException(
            status_code=409,
            detail="An active assignment already exists for this patient-clinician pair. "
                   "Deactivate the existing assignment first or use a new clinician.",
        )

    return await assignmentService.createAssignment(
        patientId=payload.patientId,
        clinicianId=payload.clinicianId,
        careContext=payload.careContext,
        reason=payload.reason,
    )


async def getAssignment(assignmentId: int):
    assignment = await assignmentService.getAssignmentById(assignmentId)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


async def getAllAssignments():
    return await assignmentService.getAllAssignments()


async def updateAssignmentStatus(assignmentId: int, payload: UpdateAssignmentStatus):
    existing = await assignmentService.getAssignmentById(assignmentId)
    if not existing:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return await assignmentService.updateAssignmentStatus(
        assignmentId=assignmentId,
        status=payload.status,
    )


async def deleteAssignment(assignmentId: int):
    existing = await assignmentService.getAssignmentById(assignmentId)
    if not existing:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await assignmentService.deleteAssignment(assignmentId)
    return {"message": "Assignment deleted successfully"}

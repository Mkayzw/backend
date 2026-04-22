from fastapi import APIRouter
from typing import List
from app.controllers import assignment_controller as controller
from app.schemas.assignment_schema import CreateAssignment, UpdateAssignmentStatus, AssignmentResponse

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


@router.post("/", response_model=AssignmentResponse, status_code=201)
async def createAssignment(payload: CreateAssignment):
    return await controller.createAssignment(payload)


@router.get("/", response_model=List[AssignmentResponse])
async def getAllAssignments():
    return await controller.getAllAssignments()


@router.get("/{assignmentId}", response_model=AssignmentResponse)
async def getAssignment(assignmentId: int):
    return await controller.getAssignment(assignmentId)


@router.put("/{assignmentId}/status", response_model=AssignmentResponse)
async def updateAssignmentStatus(assignmentId: int, payload: UpdateAssignmentStatus):
    return await controller.updateAssignmentStatus(assignmentId, payload)


@router.delete("/{assignmentId}")
async def deleteAssignment(assignmentId: int):
    return await controller.deleteAssignment(assignmentId)

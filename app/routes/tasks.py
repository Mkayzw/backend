from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.controllers import task_controller as controller
from app.schemas.task_schema import CreateTaskRequest, TaskResponse, UpdateTaskRequest
from app.services.auth import requireRole


router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    status: Optional[str] = Query(None, description="Filter by task status"),
    due: Optional[str] = Query(None, description="Use overdue to show late tasks"),
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> List[TaskResponse]:
    return await controller.listTasks(current_user=current_user, status_filter=status, due_filter=due)


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    payload: CreateTaskRequest,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> TaskResponse:
    return await controller.createTask(payload=payload, current_user=current_user)


@router.patch("/{taskId}", response_model=TaskResponse)
async def update_task(
    taskId: int,
    payload: UpdateTaskRequest,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> TaskResponse:
    return await controller.updateTask(taskId=taskId, payload=payload, current_user=current_user)

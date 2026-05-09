from app.schemas.task_schema import CreateTaskRequest, UpdateTaskRequest
from app.services import task_service


async def listTasks(*, current_user: dict, status_filter: str | None = None, due_filter: str | None = None):
    return await task_service.listTasks(
        current_user=current_user,
        status_filter=status_filter,
        due_filter=due_filter,
    )


async def createTask(*, payload: CreateTaskRequest, current_user: dict):
    return await task_service.createTask(
        current_user=current_user,
        patientId=payload.patientId,
        assignedClinicianId=payload.assignedClinicianId,
        createdFromAlertId=payload.createdFromAlertId,
        title=payload.title,
        description=payload.description,
        dueAt=payload.dueAt,
        priority=payload.priority,
    )


async def updateTask(*, taskId: int, payload: UpdateTaskRequest, current_user: dict):
    return await task_service.updateTask(
        taskId=taskId,
        current_user=current_user,
        title=payload.title,
        description=payload.description,
        dueAt=payload.dueAt,
        priority=payload.priority,
        status_value=payload.status,
    )

from pydantic import BaseModel
from app.schemas.symptom_report_schema import SymptomReportResponse
from app.schemas.assignment_schema import AssignmentResponse
from app.schemas.user_schemas import UserResponse


class StatsResponse(BaseModel):
    totalUsers:        int
    totalPatients:     int
    totalClinicians:   int
    totalAssignments:  int
    activeAssignments: int
    # Urgency indicators — the numbers a clinician sees first
    unreadAlerts:      int
    highRiskPatients:  int
    worseningPatients: int
    reportsToday:      int
    openTasks:         int = 0
    overdueTasks:      int = 0


class RecentActivityResponse(BaseModel):
    recentSymptomReports: list[SymptomReportResponse]
    recentAssignments:    list[AssignmentResponse]
    recentUsers:          list[UserResponse]

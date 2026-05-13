import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, call

from app.services import user as user_service


class DeleteUserTests(unittest.IsolatedAsyncioTestCase):
    async def test_delete_clinician_user_removes_restricting_profile_dependencies_first(self):
        original_db = user_service.db
        fake_db = SimpleNamespace(
            user=SimpleNamespace(
                find_unique=AsyncMock(return_value=SimpleNamespace(id=324, role="CLINICIAN")),
                delete=AsyncMock(),
            ),
            clinician=SimpleNamespace(
                find_unique=AsyncMock(return_value=SimpleNamespace(id=79, userId=324)),
                delete=AsyncMock(),
            ),
            patient=SimpleNamespace(find_unique=AsyncMock(return_value=None)),
            alert=SimpleNamespace(update_many=AsyncMock(), delete_many=AsyncMock()),
            task=SimpleNamespace(delete_many=AsyncMock()),
            followupresponse=SimpleNamespace(delete_many=AsyncMock()),
            followupappointment=SimpleNamespace(delete_many=AsyncMock()),
            assignment=SimpleNamespace(delete_many=AsyncMock()),
            symptomreport=SimpleNamespace(delete_many=AsyncMock()),
            pushsubscription=SimpleNamespace(delete_many=AsyncMock()),
            notification=SimpleNamespace(delete_many=AsyncMock()),
            auditlog=SimpleNamespace(update_many=AsyncMock()),
        )
        user_service.db = fake_db
        try:
            await user_service.deleteUser(324)
        finally:
            user_service.db = original_db

        fake_db.task.delete_many.assert_awaited_once_with(where={"assignedClinicianId": 79})
        fake_db.followupresponse.delete_many.assert_awaited_once_with(where={"clinicianId": 79})
        fake_db.followupappointment.delete_many.assert_awaited_once_with(where={"clinicianId": 79})
        fake_db.assignment.delete_many.assert_awaited_once_with(where={"clinicianId": 79})
        fake_db.alert.update_many.assert_has_awaits([
            call(where={"lastActionByUserId": 324}, data={"lastActionByUserId": None}),
            call(where={"assignedToClinicianId": 79}, data={"assignedToClinicianId": None}),
        ])
        fake_db.clinician.delete.assert_awaited_once_with(where={"id": 79})
        fake_db.user.delete.assert_awaited_once_with(where={"id": 324})

    async def test_delete_patient_user_removes_patient_graph_before_user(self):
        original_db = user_service.db
        fake_db = SimpleNamespace(
            user=SimpleNamespace(
                find_unique=AsyncMock(return_value=SimpleNamespace(id=12, role="PATIENT")),
                delete=AsyncMock(),
            ),
            clinician=SimpleNamespace(find_unique=AsyncMock(return_value=None), delete=AsyncMock()),
            patient=SimpleNamespace(
                find_unique=AsyncMock(return_value=SimpleNamespace(id=44, userId=12)),
                delete=AsyncMock(),
            ),
            alert=SimpleNamespace(update_many=AsyncMock(), delete_many=AsyncMock()),
            task=SimpleNamespace(delete_many=AsyncMock()),
            followupresponse=SimpleNamespace(delete_many=AsyncMock()),
            followupappointment=SimpleNamespace(delete_many=AsyncMock()),
            assignment=SimpleNamespace(delete_many=AsyncMock()),
            symptomreport=SimpleNamespace(delete_many=AsyncMock()),
            pushsubscription=SimpleNamespace(delete_many=AsyncMock()),
            notification=SimpleNamespace(delete_many=AsyncMock()),
            auditlog=SimpleNamespace(update_many=AsyncMock()),
        )
        user_service.db = fake_db
        try:
            await user_service.deleteUser(12)
        finally:
            user_service.db = original_db

        fake_db.task.delete_many.assert_awaited_once_with(where={"patientId": 44})
        fake_db.alert.delete_many.assert_awaited_once_with(where={"patientId": 44})
        fake_db.symptomreport.delete_many.assert_awaited_once_with(where={"patientId": 44})
        fake_db.assignment.delete_many.assert_awaited_once_with(where={"patientId": 44})
        fake_db.patient.delete.assert_awaited_once_with(where={"id": 44})
        fake_db.user.delete.assert_awaited_once_with(where={"id": 12})


if __name__ == "__main__":
    unittest.main()

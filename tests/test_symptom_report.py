import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.services.symptom_report import createSymptomReport


class SymptomReportTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_report_requires_active_assignment(self):
        fake_db = SimpleNamespace(
            patient=SimpleNamespace(
                find_unique=AsyncMock(return_value=SimpleNamespace(id=1, chronicConditions="[]")),
                update=AsyncMock(),
            ),
            assignment=SimpleNamespace(find_first=AsyncMock(return_value=None)),
            symptomreport=SimpleNamespace(
                create=AsyncMock(return_value=SimpleNamespace(id=7)),
                update=AsyncMock(return_value=SimpleNamespace(id=7)),
            ),
        )

        with (
            patch("app.services.symptom_report.db", fake_db),
            patch(
                "app.services.symptom_report.classifySymptomReport",
                AsyncMock(return_value=("LOW", 1.0, "[]", "low risk")),
            ),
            patch("app.services.symptom_report.analyzeTrend", AsyncMock(return_value=("STABLE", {}))),
        ):
            with self.assertRaises(HTTPException) as error:
                await createSymptomReport(
                    patientId=1,
                    symptoms=["swelling"],
                    severity="MILD",
                    durationDays=2,
                    frequency="RECURRING",
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertIn("active clinician assignment", error.exception.detail)
        fake_db.symptomreport.create.assert_not_called()


if __name__ == "__main__":
    unittest.main()

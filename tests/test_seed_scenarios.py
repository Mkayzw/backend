import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from seed_scenarios import _ensure_active_assignment


class SeedScenarioTests(unittest.IsolatedAsyncioTestCase):
    async def test_ensure_active_assignment_creates_missing_active_assignment(self):
        fake_db = SimpleNamespace(
            assignment=SimpleNamespace(
                find_first=AsyncMock(return_value=None),
                create=AsyncMock(return_value=SimpleNamespace(id=21)),
            )
        )

        with patch("seed_scenarios.db", fake_db):
            assignment = await _ensure_active_assignment(
                patient_id=5,
                clinician_id=9,
                care_context="GENERAL_REVIEW",
                reason="Current demo monitoring assignment",
            )

        self.assertEqual(assignment.id, 21)
        fake_db.assignment.create.assert_awaited_once()

    async def test_ensure_active_assignment_reuses_existing_active_assignment(self):
        existing = SimpleNamespace(id=22)
        fake_db = SimpleNamespace(
            assignment=SimpleNamespace(
                find_first=AsyncMock(return_value=existing),
                create=AsyncMock(),
            )
        )

        with patch("seed_scenarios.db", fake_db):
            assignment = await _ensure_active_assignment(
                patient_id=5,
                clinician_id=9,
                care_context="GENERAL_REVIEW",
                reason="Current demo monitoring assignment",
            )

        self.assertIs(assignment, existing)
        fake_db.assignment.create.assert_not_called()


if __name__ == "__main__":
    unittest.main()

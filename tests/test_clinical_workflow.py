from datetime import datetime, timezone
import unittest

from app.services.clinical_workflow import apply_triage_action, build_task_from_alert


def sample_alert(**overrides):
    base = {
        "id": 14,
        "patientId": 8,
        "priority": "HIGH",
        "alertType": "HIGH_RISK",
        "message": "Patient classified as HIGH RISK",
        "status": "NEW",
        "assignedToClinicianId": None,
        "resolutionNote": None,
        "resolvedAt": None,
        "snoozedUntil": None,
        "isRead": False,
    }
    base.update(overrides)
    return base


class ClinicalWorkflowTests(unittest.TestCase):
    def test_acknowledge_claims_alert_and_marks_it_seen(self):
        updated = apply_triage_action(
            sample_alert(),
            action="ACKNOWLEDGE",
            actor_clinician_id=3,
        )

        self.assertEqual(updated["status"], "ACKNOWLEDGED")
        self.assertEqual(updated["assignedToClinicianId"], 3)
        self.assertTrue(updated["isRead"])
        self.assertIsNone(updated["resolvedAt"])
        self.assertIsInstance(updated["lastActionAt"], datetime)

    def test_resolve_requires_resolution_note_and_sets_timestamp(self):
        with self.assertRaisesRegex(ValueError, "resolution note"):
            apply_triage_action(
                sample_alert(status="IN_PROGRESS", assignedToClinicianId=3, isRead=True),
                action="RESOLVE",
                actor_clinician_id=3,
            )

        updated = apply_triage_action(
            sample_alert(status="IN_PROGRESS", assignedToClinicianId=3, isRead=True),
            action="RESOLVE",
            actor_clinician_id=3,
            resolution_note="Called patient and symptoms improved.",
        )

        self.assertEqual(updated["status"], "RESOLVED")
        self.assertEqual(updated["resolutionNote"], "Called patient and symptoms improved.")
        self.assertIsNotNone(updated["resolvedAt"])

    def test_snooze_sets_status_and_deadline(self):
        snoozed_until = datetime(2026, 5, 10, 8, 0, tzinfo=timezone.utc)

        updated = apply_triage_action(
            sample_alert(status="ACKNOWLEDGED", assignedToClinicianId=3, isRead=True),
            action="SNOOZE",
            actor_clinician_id=3,
            snoozed_until=snoozed_until,
        )

        self.assertEqual(updated["status"], "SNOOZED")
        self.assertEqual(updated["snoozedUntil"], snoozed_until)
        self.assertIsNone(updated["resolvedAt"])

    def test_build_task_from_alert_copies_patient_and_links_source(self):
        due_at = datetime(2026, 5, 11, 9, 0, tzinfo=timezone.utc)

        task = build_task_from_alert(
            alert=sample_alert(),
            assigned_clinician_id=3,
            title="Follow up in 24 hours",
            due_at=due_at,
            description="Check if chest pain is recurring.",
        )

        self.assertEqual(task["patientId"], 8)
        self.assertEqual(task["assignedClinicianId"], 3)
        self.assertEqual(task["createdFromAlertId"], 14)
        self.assertEqual(task["status"], "OPEN")
        self.assertEqual(task["priority"], "HIGH")


if __name__ == "__main__":
    unittest.main()

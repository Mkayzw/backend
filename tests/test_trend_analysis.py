import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.services.trend_analysis import analyzeTrend


def report(score):
    return SimpleNamespace(riskScore=score)


class TrendAnalysisTests(unittest.IsolatedAsyncioTestCase):
    async def test_recovery_after_high_risk_spike_is_improving(self):
        async def fake_history(patient_id, limit=6):
            return [
                report(3.5),
                report(14.5),
                report(6.5),
                report(6.0),
            ]

        with patch("app.services.trend_analysis.getHistoricalReports", fake_history):
            trend, details = await analyzeTrend(patientId=1, currentRiskScore=3.5)

        self.assertEqual(trend, "IMPROVING")
        self.assertEqual(details["severity_change"], -5.5)


if __name__ == "__main__":
    unittest.main()

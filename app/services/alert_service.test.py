"""
Unit tests for Alert Generation Service

Tests the core functionality of alert generation, retrieval, and management.
"""
import asyncio
from datetime import datetime
from typing import List


# Mock database for testing
class MockDB:
    def __init__(self):
        self.alerts = []
        self.next_id = 1
    
    class AlertOperations:
        def __init__(self, parent):
            self.parent = parent
        
        async def create(self, data, include=None):
            alert = {
                "id": self.parent.next_id,
                **data,
                "patient": {"id": data["patientId"], "user": {"id": 1, "fullName": "Test Patient"}},
                "symptomReport": {"id": data["symptomReportId"], "notes": "Test notes"}
            }
            self.parent.alerts.append(alert)
            self.parent.next_id += 1
            return alert
        
        async def find_many(self, where=None, order=None, take=None, include=None):
            results = self.parent.alerts
            
            # Apply filters
            if where:
                if "priority" in where:
                    results = [a for a in results if a["priority"] == where["priority"]]
                if "isRead" in where:
                    results = [a for a in results if a["isRead"] == where["isRead"]]
                if "patientId" in where:
                    results = [a for a in results if a["patientId"] == where["patientId"]]
            
            # Apply ordering
            if order:
                if isinstance(order, dict) and "createdAt" in order:
                    results = sorted(results, key=lambda x: x["createdAt"], reverse=(order["createdAt"] == "desc"))
            
            # Apply limit
            if take:
                results = results[:take]
            
            return results
        
        async def update(self, where, data):
            for alert in self.parent.alerts:
                if alert["id"] == where["id"]:
                    alert.update(data)
                    return alert
            return None
    
    @property
    def alert(self):
        return self.AlertOperations(self)


# Test functions
async def test_generateAlert():
    """Test basic alert generation"""
    print("Testing generateAlert...")
    
    # Import with mock
    import app.services.alert_service as alert_service
    original_db = alert_service.db
    alert_service.db = MockDB()
    
    try:
        alert = await alert_service.generateAlert(
            patientId=1,
            symptomReportId=1,
            alertType="HIGH_RISK",
            priority="HIGH",
            message="Test alert"
        )
        
        assert alert["patientId"] == 1
        assert alert["symptomReportId"] == 1
        assert alert["alertType"] == "HIGH_RISK"
        assert alert["priority"] == "HIGH"
        assert alert["message"] == "Test alert"
        assert alert["isRead"] == False
        print("✓ generateAlert works correctly")
    finally:
        alert_service.db = original_db


async def test_generateRiskAlert():
    """Test HIGH risk alert generation"""
    print("Testing generateRiskAlert...")
    
    import app.services.alert_service as alert_service
    original_db = alert_service.db
    alert_service.db = MockDB()
    
    try:
        # Test HIGH risk generates alert
        alert = await alert_service.generateRiskAlert(1, 1, "HIGH")
        assert alert is not None
        assert alert["priority"] == "HIGH"
        assert alert["alertType"] == "HIGH_RISK"
        print("✓ HIGH risk generates HIGH priority alert")
        
        # Test non-HIGH risk returns None
        alert = await alert_service.generateRiskAlert(1, 2, "MEDIUM")
        assert alert is None
        print("✓ Non-HIGH risk returns None")
    finally:
        alert_service.db = original_db


async def test_generateTrendAlert():
    """Test WORSENING trend alert generation"""
    print("Testing generateTrendAlert...")
    
    import app.services.alert_service as alert_service
    original_db = alert_service.db
    alert_service.db = MockDB()
    
    try:
        # Test WORSENING trend generates alert
        alert = await alert_service.generateTrendAlert(1, 1, "WORSENING")
        assert alert is not None
        assert alert["priority"] == "MEDIUM"
        assert alert["alertType"] == "WORSENING_TREND"
        print("✓ WORSENING trend generates MEDIUM priority alert")
        
        # Test non-WORSENING trend returns None
        alert = await alert_service.generateTrendAlert(1, 2, "STABLE")
        assert alert is None
        print("✓ Non-WORSENING trend returns None")
    finally:
        alert_service.db = original_db


async def test_getAlerts_sorting():
    """Test alert sorting by priority and timestamp"""
    print("Testing getAlerts sorting...")
    
    import app.services.alert_service as alert_service
    original_db = alert_service.db
    mock_db = MockDB()
    alert_service.db = mock_db
    
    try:
        # Create alerts with different priorities and timestamps
        base_time = datetime(2024, 1, 1, 12, 0, 0)
        
        # Create alerts in mixed order
        await alert_service.generateAlert(1, 1, "TEST", "LOW", "Low priority 1")
        mock_db.alerts[-1]["createdAt"] = datetime(2024, 1, 1, 12, 0, 0)
        
        await alert_service.generateAlert(1, 2, "TEST", "HIGH", "High priority 1")
        mock_db.alerts[-1]["createdAt"] = datetime(2024, 1, 1, 12, 1, 0)
        
        await alert_service.generateAlert(1, 3, "TEST", "MEDIUM", "Medium priority 1")
        mock_db.alerts[-1]["createdAt"] = datetime(2024, 1, 1, 12, 2, 0)
        
        await alert_service.generateAlert(1, 4, "TEST", "HIGH", "High priority 2")
        mock_db.alerts[-1]["createdAt"] = datetime(2024, 1, 1, 12, 3, 0)
        
        await alert_service.generateAlert(1, 5, "TEST", "LOW", "Low priority 2")
        mock_db.alerts[-1]["createdAt"] = datetime(2024, 1, 1, 12, 4, 0)
        
        # Get all alerts
        alerts = await alert_service.getAlerts()
        
        # Verify sorting: HIGH first, then MEDIUM, then LOW
        # Within same priority, most recent first
        assert len(alerts) == 5
        assert alerts[0]["priority"] == "HIGH"
        assert alerts[0]["message"] == "High priority 2"  # Most recent HIGH
        assert alerts[1]["priority"] == "HIGH"
        assert alerts[1]["message"] == "High priority 1"  # Older HIGH
        assert alerts[2]["priority"] == "MEDIUM"
        assert alerts[3]["priority"] == "LOW"
        assert alerts[3]["message"] == "Low priority 2"  # Most recent LOW
        assert alerts[4]["priority"] == "LOW"
        assert alerts[4]["message"] == "Low priority 1"  # Older LOW
        
        print("✓ Alerts sorted correctly by priority (HIGH > MEDIUM > LOW) and timestamp (recent first)")
    finally:
        alert_service.db = original_db


async def test_getAlerts_filtering():
    """Test alert filtering by priority and isRead"""
    print("Testing getAlerts filtering...")
    
    import app.services.alert_service as alert_service
    original_db = alert_service.db
    mock_db = MockDB()
    alert_service.db = mock_db
    
    try:
        # Create alerts with different priorities and read status
        await alert_service.generateAlert(1, 1, "TEST", "HIGH", "High unread")
        await alert_service.generateAlert(1, 2, "TEST", "MEDIUM", "Medium unread")
        await alert_service.generateAlert(1, 3, "TEST", "LOW", "Low unread")
        
        # Mark one as read
        mock_db.alerts[1]["isRead"] = True
        
        # Test priority filter
        high_alerts = await alert_service.getAlerts(priority="HIGH")
        assert len(high_alerts) == 1
        assert high_alerts[0]["priority"] == "HIGH"
        print("✓ Priority filter works")
        
        # Test isRead filter
        unread_alerts = await alert_service.getAlerts(isRead=False)
        assert len(unread_alerts) == 2
        print("✓ isRead filter works")
        
        # Test combined filters
        unread_medium = await alert_service.getAlerts(priority="MEDIUM", isRead=False)
        assert len(unread_medium) == 0  # The MEDIUM alert was marked as read
        print("✓ Combined filters work")
    finally:
        alert_service.db = original_db


async def test_markAlertAsRead():
    """Test marking alert as read"""
    print("Testing markAlertAsRead...")
    
    import app.services.alert_service as alert_service
    original_db = alert_service.db
    mock_db = MockDB()
    alert_service.db = mock_db
    
    try:
        # Create an alert
        alert = await alert_service.generateAlert(1, 1, "TEST", "HIGH", "Test")
        assert alert["isRead"] == False
        
        # Mark as read
        updated = await alert_service.markAlertAsRead(alert["id"])
        assert updated["isRead"] == True
        print("✓ markAlertAsRead works correctly")
    finally:
        alert_service.db = original_db


async def test_getAlertsByPatient():
    """Test getting alerts for a specific patient"""
    print("Testing getAlertsByPatient...")
    
    import app.services.alert_service as alert_service
    original_db = alert_service.db
    mock_db = MockDB()
    alert_service.db = mock_db
    
    try:
        # Create alerts for different patients
        await alert_service.generateAlert(1, 1, "TEST", "HIGH", "Patient 1 alert 1")
        await alert_service.generateAlert(2, 2, "TEST", "MEDIUM", "Patient 2 alert")
        await alert_service.generateAlert(1, 3, "TEST", "LOW", "Patient 1 alert 2")
        
        # Get alerts for patient 1
        patient1_alerts = await alert_service.getAlertsByPatient(1)
        assert len(patient1_alerts) == 2
        assert all(a["patientId"] == 1 for a in patient1_alerts)
        print("✓ getAlertsByPatient filters correctly")
    finally:
        alert_service.db = original_db


async def run_all_tests():
    """Run all tests"""
    print("\n=== Running Alert Service Tests ===\n")
    
    try:
        await test_generateAlert()
        await test_generateRiskAlert()
        await test_generateTrendAlert()
        await test_getAlerts_sorting()
        await test_getAlerts_filtering()
        await test_markAlertAsRead()
        await test_getAlertsByPatient()
        
        print("\n=== All tests passed! ===\n")
        return True
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}\n")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}\n")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)

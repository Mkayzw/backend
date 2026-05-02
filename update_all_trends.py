import asyncio
from app.db import db
from app.services.trend_analysis import analyzeTrend

async def main():
    await db.connect()
    try:
        # Fetch all patients
        patients = await db.patient.find_many(include={"symptomReports": {"order_by": {"createdAt": "desc"}}})
        
        updated_count = 0
        for p in patients:
            reports = p.symptomReports
            if not reports:
                continue
            
            # The most recent report is reports[0]
            current_report = reports[0]
            
            # Re-run the new trend analysis logic
            trend_status, details = await analyzeTrend(p.id, current_report.riskScore)
            
            # Update the patient in the database
            await db.patient.update(
                where={"id": p.id},
                data={
                    "currentTrendStatus": trend_status
                }
            )
            print(f"Updated Patient {p.id} ({p.user.fullName if p.user else 'Unknown'}) to {trend_status}")
            updated_count += 1
            
        print(f"\nSuccessfully re-analyzed and updated {updated_count} patients.")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())

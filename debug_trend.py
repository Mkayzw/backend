import asyncio
from app.db import db
from app.services.trend_analysis import analyzeTrend

async def main():
    await db.connect()
    try:
        # Find the patient with the asthma scenario or any patient with reports
        patients = await db.patient.find_many(include={"symptomReports": {"order_by": {"createdAt": "desc"}}})
        for p in patients:
            reports = p.symptomReports
            if not reports:
                continue
            
            print(f"Patient {p.id} ({p.user.fullName if p.user else ''}) - {len(reports)} reports")
            for r in reports[:5]:
                print(f"  - {r.createdAt} | {r.severity} | Score: {r.riskScore}")
            
            if len(reports) > 0:
                trend, details = await analyzeTrend(p.id, reports[0].riskScore)
                print(f"  --> Analyzed Trend: {trend}")
                print(f"  --> Details: {details}")
                print()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())

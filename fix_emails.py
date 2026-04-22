import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    
    users = await db.user.find_many()
    
    count = 0
    for u in users:
        if u.email.endswith(".test"):
            new_email = u.email.replace(".test", ".com")
            await db.user.update(where={"id": u.id}, data={"email": new_email})
            count += 1
        
    print(f"Updated {count} user emails from .test to .com")
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(main())

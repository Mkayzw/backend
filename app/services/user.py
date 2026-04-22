from __future__ import annotations
from passlib.context import CryptContext
from app.db import db

_pwd_context=CryptContext(schemes=["bcrypt"])

#hash password
def hashPassword(password:str)->str:
    return _pwd_context.hash(password)

def verifyPassword(plainPass:str,hashedPassword:str)->bool:
    return _pwd_context.verify(plainPass,hashedPassword)

def normalizeRole(role:str|None)->str:
    if not role:
        return "PATIENT"
    roleUpper=role.strip().upper()
    if roleUpper in{"CLINICIAN"}:
        return "CLINICIAN"
    if roleUpper in{"PATIENT","ADMIN"}:
        return roleUpper
    return "PATIENT"

#getuser(s)
async def getUserById(userId: int):
    return await db.user.find_unique(where={"id": userId})
async def getUserByEmail(email:str):
    return await db.user.find_unique(where={"email":email})
async def getAllUsers():
    return await db.user.find_many(order={"createdAt":"desc"})

#create user
async def createUser(
  *,
  email:str,
  fullName:str,
  phone:str,
  role:str,
  password:str,


):
  return await db.user.create(
      data={"email":email,
            "fullName":fullName,
            "phone":phone,
            "role":normalizeRole(role),
            "password":hashPassword(password)
            })

#update user
async def updateUser(
    userId: int, *, fullName: str | None = None, phone: str | None = None
):
    return await db.user.update(
        where={"id": userId},
        data={"fullName": fullName, "phone": phone},
    )

#deleteUser
async def deleteUser(userId: int) -> None:
    await db.user.delete(where={"id": userId})

async def authenticateUser(email:str,password:str)->bool:
    user=await getUserByEmail(email)
    if not user:
        return  None
    if not verifyPassword(password, user.password):
        return None
    return user
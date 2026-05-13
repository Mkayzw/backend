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
async def getAllUsers(q: str | None = None, role: str | None = None):
    where_clause = {}
    if role:
        where_clause["role"] = role.upper()
    if q:
        where_clause["OR"] = [
            {"email": {"contains": q}},
            {"fullName": {"contains": q}},
        ]
    return await db.user.find_many(where=where_clause, order={"createdAt": "desc"})

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
    user = await db.user.find_unique(where={"id": userId})
    if not user:
        return

    await db.alert.update_many(
        where={"lastActionByUserId": userId},
        data={"lastActionByUserId": None},
    )
    await db.pushsubscription.delete_many(where={"userId": userId})
    await db.notification.delete_many(where={"userId": userId})
    await db.auditlog.update_many(
        where={"actorUserId": userId},
        data={"actorUserId": None},
    )

    patient = await db.patient.find_unique(where={"userId": userId})
    if patient:
        await db.followupresponse.delete_many(where={"patientId": patient.id})
        await db.followupappointment.delete_many(where={"patientId": patient.id})
        await db.task.delete_many(where={"patientId": patient.id})
        await db.alert.delete_many(where={"patientId": patient.id})
        await db.symptomreport.delete_many(where={"patientId": patient.id})
        await db.assignment.delete_many(where={"patientId": patient.id})
        await db.patient.delete(where={"id": patient.id})

    clinician = await db.clinician.find_unique(where={"userId": userId})
    if clinician:
        await db.alert.update_many(
            where={"assignedToClinicianId": clinician.id},
            data={"assignedToClinicianId": None},
        )
        await db.task.delete_many(where={"assignedClinicianId": clinician.id})
        await db.followupresponse.delete_many(where={"clinicianId": clinician.id})
        await db.followupappointment.delete_many(where={"clinicianId": clinician.id})
        await db.assignment.delete_many(where={"clinicianId": clinician.id})
        await db.clinician.delete(where={"id": clinician.id})

    await db.user.delete(where={"id": userId})

async def authenticateUser(email:str,password:str)->bool:
    user=await getUserByEmail(email)
    if not user:
        return  None
    if not verifyPassword(password, user.password):
        return None
    return user

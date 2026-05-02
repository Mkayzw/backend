from fastapi import HTTPException
from app.services import user as userService
from app.schemas.user_schemas import UserCreate,LoginReq


async def CreateUser(userData:UserCreate):
    existingUser=await userService.getUserByEmail(userData.email)
    if existingUser:
        raise HTTPException(status_code=400,detail="A user with this email already exists")
    newUser=await userService.createUser(
        email=userData.email,
        password=userData.password,
        fullName=userData.fullname,
        phone=userData.phone,
        role=userData.role
    )

    return newUser
 
 
async def Login(loginData: LoginReq):
    user = await userService.authenticateUser(loginData.email, loginData.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user

#GET USER(S)
async def getAllUsers(q: str | None = None, role: str | None = None):
    return await userService.getAllUsers(q=q, role=role)

async def getSingleUser(userId:int):
    user=await userService.getUserById(userId)
    if not user:
        raise HTTPException(status_code=404,detail="no such user exists with ID")
    return user

#async def userByEmail(email:str):
    user=await userService.getUserByEmail(email)
    if not user:
        raise HTTPException(status_code=404,detail="no such user exists with this email")
    return user

async def deleteUser(userId:int):
    user=await userService.getUserById(userId)
    if not user:
        raise HTTPException(status_code=404,detail="user not found")
    await userService.deleteUser(userId)
    return{"message":"user sucessfully deleted"}

async def updateUser(userId: int, fullName: str | None, phone: str | None):
     user=await userService.getUserById(userId)
     if not user:
        raise HTTPException(status_code=404,detail="user not found")
     return await userService.updateUser(userId,fullName=fullName,phone=phone)
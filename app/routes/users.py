from fastapi import APIRouter
from typing import List

from app.controllers import user_controller as userController
from app.schemas.user_schemas import( UpdateUser, UserCreate, 
                                     UserResponse,LoginReq,
                                     LoginResponse
                                     )

# Create the router for Users
router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/",response_model=UserResponse)
async def createUser(userData:UserCreate):
    return await userController.CreateUser(userData)

@router.post("/login",response_model=LoginResponse)
async def login(loginData:LoginReq):
   return await userController.Login(loginData)

  
@router.get("/",response_model=List[UserResponse])
async def getAllUsers():
    return await userController.getAllUsers()

@router.get("/{userId}",response_model=UserResponse)
async def getUser(userId:int):
    return await userController.getSingleUser(userId)


@router.put("/{userId}", response_model=UserResponse)
async def updateUser(userId: int, payload: UpdateUser):
    return await userController.updateUser(userId, payload.fullname, payload.phone)

@router.delete("/{userId}")
async def deleteUser(userId:int):
 return await userController.deleteUser(userId)
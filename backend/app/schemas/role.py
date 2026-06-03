"""schemas/role.py — Pydantic schemas for roles and permissions."""
from typing import List
from pydantic import BaseModel


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    """Request body for POST /roles/create"""
    name: str


class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: List[PermissionResponse] = []

    model_config = {"from_attributes": True}


class AssignRoleRequest(BaseModel):
    """Request body for POST /users/assign-role"""
    user_id: int
    role_name: str

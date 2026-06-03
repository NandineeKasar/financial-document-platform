"""
endpoints/roles.py — RBAC management routes.

POST /roles/create          — Create a new role (Admin only)
POST /users/assign-role     — Assign a role to a user (Admin only)
GET  /users/{id}/roles      — Get roles for a user
GET  /users/{id}/permissions — Get permissions for a user
"""
import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, require_roles
from app.models.user import User
from app.schemas.role import RoleCreate, RoleResponse, AssignRoleRequest, PermissionResponse
from app.services.role_service import (
    create_role,
    assign_role_to_user,
    get_user_roles,
    get_user_permissions,
)

router = APIRouter(tags=["RBAC"])
logger = logging.getLogger(__name__)


@router.post(
    "/roles/create",
    response_model=RoleResponse,
    status_code=201,
    summary="Create a new role (Admin only)",
)
def create_new_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(["Admin"])),  # _ means "unused variable"
):
    """Only Admins can create roles."""
    return create_role(db, data.name)


@router.post(
    "/users/assign-role",
    response_model=dict,
    summary="Assign a role to a user (Admin only)",
)
def assign_role(
    data: AssignRoleRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(["Admin"])),
):
    """Assign a named role to a user by user_id."""
    user = assign_role_to_user(db, data.user_id, data.role_name)
    return {"message": f"Role '{data.role_name}' assigned to user {user.email}"}


@router.get(
    "/users/{user_id}/roles",
    response_model=List[RoleResponse],
    summary="Get all roles assigned to a user",
)
def get_roles(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_user_roles(db, user_id)


@router.get(
    "/users/{user_id}/permissions",
    response_model=List[PermissionResponse],
    summary="Get all permissions for a user (aggregated across roles)",
)
def get_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_user_permissions(db, user_id)

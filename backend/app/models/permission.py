"""
permission.py — Re-export Permission from role.py.

Permission is defined inside role.py alongside Role because they share
the role_permissions association table. This file exists so other modules
can do: `from app.models.permission import Permission`
"""
from app.models.role import Permission  # noqa: F401

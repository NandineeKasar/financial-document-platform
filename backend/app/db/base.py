"""
base.py — SQLAlchemy declarative base class.

All ORM models inherit from `Base`. SQLAlchemy uses the Base to
track all model classes and their associated database tables.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass

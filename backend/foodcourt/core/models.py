from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with role-based access control."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        COUNTER = 'counter', 'Counter Staff'
        VENDOR = 'vendor', 'Vendor'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.COUNTER,
    )
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_counter(self):
        return self.role == self.Role.COUNTER

    @property
    def is_vendor(self):
        return self.role == self.Role.VENDOR

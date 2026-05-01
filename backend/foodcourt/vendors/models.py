from django.db import models
from django.conf import settings


class Vendor(models.Model):
    """Food vendor/stall in the food court."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    stall_number = models.CharField(max_length=10, unique=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_vendors',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['stall_number']

    def __str__(self):
        return f"Stall {self.stall_number} - {self.name}"


class FoodItem(models.Model):
    """Food item offered by a vendor."""
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='food_items')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['vendor', 'name']

    def __str__(self):
        return f"{self.name} ({self.vendor.name}) - {self.price}"

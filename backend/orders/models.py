from django.db import models
from django.conf import settings


class Order(models.Model):
    """A purchase order made by a customer using their prepaid card."""

    class Status(models.TextChoices):
        COMPLETED = 'completed', 'Completed'
        REJECTED = 'rejected', 'Rejected'

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    card = models.ForeignKey(
        'cards.PrepaidCard',
        on_delete=models.PROTECT,
        related_name='orders',
    )
    vendor = models.ForeignKey(
        'vendors.Vendor',
        on_delete=models.PROTECT,
        related_name='orders',
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.COMPLETED)
    rejection_reason = models.CharField(max_length=200, blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='processed_orders',
    )
    transaction = models.OneToOneField(
        'transactions.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number} - {self.card.customer_name}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self._generate_order_number()
        super().save(*args, **kwargs)

    def _generate_order_number(self):
        import random
        import string
        return 'ORD' + ''.join(random.choices(string.digits, k=8))


class OrderItem(models.Model):
    """Individual line item within an order."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    food_item = models.ForeignKey(
        'vendors.FoodItem',
        on_delete=models.PROTECT,
        related_name='order_items',
    )
    food_item_name = models.CharField(max_length=100)  # snapshot at time of order
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)  # snapshot
    quantity = models.PositiveIntegerField(default=1)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.quantity}x {self.food_item_name} @ {self.unit_price}"

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

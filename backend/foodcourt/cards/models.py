import uuid
from django.db import models
from django.conf import settings


class PrepaidCard(models.Model):
    """Prepaid card with QR code for food court purchases."""

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        SUSPENDED = 'suspended', 'Suspended'

    card_number = models.CharField(max_length=20, unique=True, editable=False)
    uid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_cards',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Card {self.card_number} - {self.customer_name}"

    def save(self, *args, **kwargs):
        if not self.card_number:
            self.card_number = self._generate_card_number()
        super().save(*args, **kwargs)

    def _generate_card_number(self):
        import random
        return 'FC' + ''.join([str(random.randint(0, 9)) for _ in range(8)])

    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE

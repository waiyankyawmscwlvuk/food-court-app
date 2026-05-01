from django.db import models
from django.conf import settings


class Transaction(models.Model):
    """Records all financial transactions (top-up and purchase)."""

    class TransactionType(models.TextChoices):
        TOPUP = 'topup', 'Top-Up'
        PURCHASE = 'purchase', 'Purchase'

    class PaymentMethod(models.TextChoices):
        CASH = 'cash', 'Cash'
        DIGITAL_WALLET = 'digital_wallet', 'Digital Wallet'
        BANK_CARD = 'bank_card', 'Bank Card'

    transaction_id = models.CharField(max_length=20, unique=True, editable=False)
    card = models.ForeignKey(
        'cards.PrepaidCard',
        on_delete=models.PROTECT,
        related_name='transactions',
    )
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        blank=True,
        null=True,
    )
    note = models.TextField(blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='processed_transactions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_id} - {self.get_transaction_type_display()} - {self.amount}"

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = self._generate_transaction_id()
        super().save(*args, **kwargs)

    def _generate_transaction_id(self):
        import random
        import string
        prefix = 'TXN'
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
        return prefix + suffix

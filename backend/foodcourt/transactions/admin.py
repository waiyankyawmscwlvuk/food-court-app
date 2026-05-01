from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'card', 'transaction_type', 'amount', 'payment_method', 'created_at']
    list_filter = ['transaction_type', 'payment_method']
    readonly_fields = ['transaction_id', 'balance_before', 'balance_after', 'created_at']

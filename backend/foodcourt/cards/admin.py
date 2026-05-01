from django.contrib import admin
from .models import PrepaidCard

@admin.register(PrepaidCard)
class PrepaidCardAdmin(admin.ModelAdmin):
    list_display = ['card_number', 'customer_name', 'balance', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['card_number', 'customer_name']
    readonly_fields = ['card_number', 'uid', 'qr_code', 'created_at', 'updated_at']

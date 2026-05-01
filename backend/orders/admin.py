from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['food_item_name', 'unit_price', 'subtotal']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'card', 'vendor', 'total_amount', 'status', 'created_at']
    list_filter = ['status', 'vendor']
    inlines = [OrderItemInline]
    readonly_fields = ['order_number', 'balance_before', 'balance_after', 'created_at']

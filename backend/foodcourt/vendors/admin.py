from django.contrib import admin
from .models import Vendor, FoodItem

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['stall_number', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']

@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'vendor', 'price', 'is_available']
    list_filter = ['vendor', 'is_available']

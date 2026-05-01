from rest_framework import serializers
from .models import Vendor, FoodItem


class FoodItemSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = FoodItem
        fields = ['id', 'vendor', 'vendor_name', 'name', 'description',
                  'price', 'is_available', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class VendorSerializer(serializers.ModelSerializer):
    food_items = FoodItemSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Vendor
        fields = ['id', 'name', 'description', 'stall_number', 'owner',
                  'owner_name', 'is_active', 'food_items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class VendorListSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    item_count = serializers.IntegerField(source='food_items.count', read_only=True)

    class Meta:
        model = Vendor
        fields = ['id', 'name', 'description', 'stall_number', 'owner',
                  'owner_name', 'is_active', 'item_count', 'created_at']
        read_only_fields = ['id', 'created_at']

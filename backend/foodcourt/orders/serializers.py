from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'food_item', 'food_item_name', 'unit_price', 'quantity', 'subtotal']
        read_only_fields = ['id', 'food_item_name', 'unit_price', 'subtotal']


class OrderItemCreateSerializer(serializers.Serializer):
    food_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    card_number = serializers.CharField(source='card.card_number', read_only=True)
    customer_name = serializers.CharField(source='card.customer_name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.username', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'card', 'card_number', 'customer_name',
            'vendor', 'vendor_name', 'total_amount', 'balance_before',
            'balance_after', 'status', 'rejection_reason', 'items',
            'processed_by', 'processed_by_name', 'transaction', 'created_at',
        ]
        read_only_fields = ['id', 'order_number', 'total_amount', 'balance_before',
                            'balance_after', 'status', 'processed_by', 'transaction', 'created_at']


class CreateOrderSerializer(serializers.Serializer):
    card_uid = serializers.UUIDField()
    vendor_id = serializers.IntegerField()
    items = OrderItemCreateSerializer(many=True, min_length=1)

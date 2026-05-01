from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    card_number = serializers.CharField(source='card.card_number', read_only=True)
    customer_name = serializers.CharField(source='card.customer_name', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.username', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_id', 'card', 'card_number', 'customer_name',
            'transaction_type', 'amount', 'balance_before', 'balance_after',
            'payment_method', 'note', 'processed_by', 'processed_by_name', 'created_at',
        ]
        read_only_fields = [
            'id', 'transaction_id', 'balance_before', 'balance_after',
            'processed_by', 'created_at',
        ]


class TopUpSerializer(serializers.Serializer):
    card_uid = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    payment_method = serializers.ChoiceField(choices=Transaction.PaymentMethod.choices)
    note = serializers.CharField(required=False, allow_blank=True)


class DailyReportSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)

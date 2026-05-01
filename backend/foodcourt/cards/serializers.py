from rest_framework import serializers
from .models import PrepaidCard


class PrepaidCardSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = PrepaidCard
        fields = [
            'id', 'card_number', 'uid', 'customer_name', 'customer_phone',
            'customer_email', 'balance', 'status', 'qr_code', 'qr_code_url',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'card_number', 'uid', 'balance', 'qr_code',
                            'created_by', 'created_at', 'updated_at']

    def get_qr_code_url(self, obj):
        request = self.context.get('request')
        if obj.qr_code and request:
            return request.build_absolute_uri(obj.qr_code.url)
        return None


class PrepaidCardCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrepaidCard
        fields = ['customer_name', 'customer_phone', 'customer_email']


class CardScanSerializer(serializers.Serializer):
    uid = serializers.UUIDField()

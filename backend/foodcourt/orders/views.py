from decimal import Decimal
from django.db import transaction as db_transaction
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Order, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer
from foodcourt.cards.models import PrepaidCard
from foodcourt.vendors.models import Vendor, FoodItem
from foodcourt.transactions.models import Transaction
from foodcourt.core.permissions import IsAdminOrCounter


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.select_related('card', 'vendor', 'processed_by')
        card_id = self.request.query_params.get('card')
        vendor_id = self.request.query_params.get('vendor')
        date_str = self.request.query_params.get('date')
        if card_id:
            qs = qs.filter(card_id=card_id)
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        if date_str:
            qs = qs.filter(created_at__date=date_str)
        return qs


class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]


class CreateOrderView(APIView):
    """Process a food purchase using a prepaid card."""
    permission_classes = [IsAdminOrCounter]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Validate card
        try:
            card = PrepaidCard.objects.get(uid=data['card_uid'])
        except PrepaidCard.DoesNotExist:
            return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not card.is_active:
            return Response({'error': 'Card is not active.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate vendor
        try:
            vendor = Vendor.objects.get(pk=data['vendor_id'], is_active=True)
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found or inactive.'}, status=status.HTTP_404_NOT_FOUND)

        # Validate food items and calculate total
        order_items = []
        total = Decimal('0.00')
        for item_data in data['items']:
            try:
                food_item = FoodItem.objects.get(pk=item_data['food_item_id'], vendor=vendor, is_available=True)
            except FoodItem.DoesNotExist:
                return Response(
                    {'error': f"Food item {item_data['food_item_id']} not found or unavailable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qty = item_data['quantity']
            subtotal = food_item.price * qty
            total += subtotal
            order_items.append({'food_item': food_item, 'quantity': qty, 'subtotal': subtotal})

        # Check balance
        if card.balance < total:
            return Response(
                {'error': 'Insufficient balance.', 'balance': str(card.balance), 'required': str(total)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            balance_before = card.balance
            card.balance -= total
            card.save()

            # Create transaction record
            txn = Transaction.objects.create(
                card=card,
                transaction_type=Transaction.TransactionType.PURCHASE,
                amount=total,
                balance_before=balance_before,
                balance_after=card.balance,
                processed_by=request.user,
            )

            # Create order
            order = Order.objects.create(
                card=card,
                vendor=vendor,
                total_amount=total,
                balance_before=balance_before,
                balance_after=card.balance,
                status=Order.Status.COMPLETED,
                processed_by=request.user,
                transaction=txn,
            )

            # Create order items
            for item in order_items:
                OrderItem.objects.create(
                    order=order,
                    food_item=item['food_item'],
                    food_item_name=item['food_item'].name,
                    unit_price=item['food_item'].price,
                    quantity=item['quantity'],
                    subtotal=item['subtotal'],
                )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

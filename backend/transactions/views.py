from datetime import date
from decimal import Decimal
from django.db.models import Sum, Count
from django.db import transaction as db_transaction
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Transaction
from .serializers import TransactionSerializer, TopUpSerializer
from foodcourt.cards.models import PrepaidCard
from foodcourt.core.permissions import IsAdminOrCounter, IsAdmin


class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminOrCounter]

    def get_queryset(self):
        qs = Transaction.objects.select_related('card', 'processed_by')
        card_id = self.request.query_params.get('card')
        txn_type = self.request.query_params.get('type')
        date_str = self.request.query_params.get('date')
        if card_id:
            qs = qs.filter(card_id=card_id)
        if txn_type:
            qs = qs.filter(transaction_type=txn_type)
        if date_str:
            qs = qs.filter(created_at__date=date_str)
        return qs


class TopUpView(APIView):
    permission_classes = [IsAdminOrCounter]

    def post(self, request):
        serializer = TopUpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        try:
            card = PrepaidCard.objects.get(uid=data['card_uid'])
        except PrepaidCard.DoesNotExist:
            return Response({'error': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not card.is_active:
            return Response({'error': 'Card is not active.'}, status=status.HTTP_400_BAD_REQUEST)
        with db_transaction.atomic():
            balance_before = card.balance
            card.balance += Decimal(str(data['amount']))
            card.save()
            txn = Transaction.objects.create(
                card=card,
                transaction_type=Transaction.TransactionType.TOPUP,
                amount=data['amount'],
                balance_before=balance_before,
                balance_after=card.balance,
                payment_method=data['payment_method'],
                note=data.get('note', ''),
                processed_by=request.user,
            )
        return Response(TransactionSerializer(txn).data, status=status.HTTP_201_CREATED)


class ReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        from foodcourt.orders.models import Order
        from .receipt import generate_receipt_pdf
        try:
            order = Order.objects.prefetch_related('items').select_related(
                'card', 'vendor', 'processed_by', 'transaction'
            ).get(pk=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        pdf_bytes = generate_receipt_pdf(order)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt_{order.order_number}.pdf"'
        return response


class DailySalesReportView(APIView):
    permission_classes = [IsAdminOrCounter]

    def get(self, request):
        report_date_str = request.query_params.get('date')
        if report_date_str:
            try:
                report_date = date.fromisoformat(report_date_str)
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)
        else:
            report_date = date.today()
        qs = Transaction.objects.filter(created_at__date=report_date)
        topups = qs.filter(transaction_type=Transaction.TransactionType.TOPUP)
        purchases = qs.filter(transaction_type=Transaction.TransactionType.PURCHASE)
        topup_total = topups.aggregate(total=Sum('amount'))['total'] or 0
        sales_total = purchases.aggregate(total=Sum('amount'))['total'] or 0
        topup_by_method = topups.values('payment_method').annotate(total=Sum('amount'), count=Count('id'))
        from foodcourt.orders.models import Order
        vendor_sales = Order.objects.filter(
            created_at__date=report_date, status='completed',
        ).values('vendor__name', 'vendor__stall_number').annotate(total=Sum('total_amount'), count=Count('id'))
        return Response({
            'date': report_date.isoformat(),
            'total_topup': topup_total,
            'total_sales': sales_total,
            'total_transactions': qs.count(),
            'topup_count': topups.count(),
            'purchase_count': purchases.count(),
            'topup_by_payment_method': list(topup_by_method),
            'vendor_sales': list(vendor_sales),
        })


class TopUpReportView(APIView):
    permission_classes = [IsAdminOrCounter]

    def get(self, request):
        report_date_str = request.query_params.get('date')
        report_date = date.fromisoformat(report_date_str) if report_date_str else date.today()
        topups = Transaction.objects.filter(
            transaction_type=Transaction.TransactionType.TOPUP,
            created_at__date=report_date,
        ).select_related('card', 'processed_by')
        total = topups.aggregate(total=Sum('amount'))['total'] or 0
        by_method = topups.values('payment_method').annotate(total=Sum('amount'), count=Count('id'))
        return Response({
            'date': report_date.isoformat(),
            'total_topup': total,
            'topup_count': topups.count(),
            'by_payment_method': list(by_method),
            'transactions': TransactionSerializer(topups, many=True).data,
        })

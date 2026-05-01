from django.urls import path
from .views import TransactionListView, TopUpView, ReceiptView, DailySalesReportView, TopUpReportView

urlpatterns = [
    path('', TransactionListView.as_view(), name='transaction_list'),
    path('topup/', TopUpView.as_view(), name='topup'),
    path('receipt/<int:order_id>/', ReceiptView.as_view(), name='receipt'),
    path('reports/daily/', DailySalesReportView.as_view(), name='daily_report'),
    path('reports/topup/', TopUpReportView.as_view(), name='topup_report'),
]

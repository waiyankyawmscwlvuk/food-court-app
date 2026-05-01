from django.urls import path
from .views import (
    PrepaidCardListCreateView,
    PrepaidCardDetailView,
    CardStatusToggleView,
    CardScanView,
    PrintCardView,
    PrintBulkCardsView,
)

urlpatterns = [
    path('', PrepaidCardListCreateView.as_view(), name='card_list_create'),
    path('<int:pk>/', PrepaidCardDetailView.as_view(), name='card_detail'),
    path('<int:pk>/toggle-status/', CardStatusToggleView.as_view(), name='card_toggle_status'),
    path('scan/', CardScanView.as_view(), name='card_scan'),
    path('<int:pk>/print/', PrintCardView.as_view(), name='card_print'),
    path('print-bulk/', PrintBulkCardsView.as_view(), name='card_print_bulk'),
]

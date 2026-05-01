from django.urls import path
from .views import OrderListView, OrderDetailView, CreateOrderView

urlpatterns = [
    path('', OrderListView.as_view(), name='order_list'),
    path('create/', CreateOrderView.as_view(), name='order_create'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order_detail'),
]

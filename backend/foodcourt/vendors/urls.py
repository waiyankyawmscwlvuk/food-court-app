from django.urls import path
from .views import (
    VendorListCreateView, VendorDetailView,
    FoodItemListCreateView, FoodItemDetailView,
)

urlpatterns = [
    path('', VendorListCreateView.as_view(), name='vendor_list_create'),
    path('<int:pk>/', VendorDetailView.as_view(), name='vendor_detail'),
    path('food-items/', FoodItemListCreateView.as_view(), name='food_item_list_create'),
    path('food-items/<int:pk>/', FoodItemDetailView.as_view(), name='food_item_detail'),
]

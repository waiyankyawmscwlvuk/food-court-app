from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Vendor, FoodItem
from .serializers import VendorSerializer, VendorListSerializer, FoodItemSerializer
from foodcourt.core.permissions import IsAdmin, IsAdminOrVendor


class VendorListCreateView(generics.ListCreateAPIView):
    queryset = Vendor.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return VendorListSerializer
        return VendorSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAuthenticated()]


class VendorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]


class FoodItemListCreateView(generics.ListCreateAPIView):
    serializer_class = FoodItemSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrVendor()]

    def get_queryset(self):
        qs = FoodItem.objects.select_related('vendor')
        vendor_id = self.request.query_params.get('vendor')
        available = self.request.query_params.get('available')
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        if available:
            qs = qs.filter(is_available=True)
        return qs


class FoodItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrVendor()]

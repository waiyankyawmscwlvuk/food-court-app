from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

def api_root(request):
    return JsonResponse({
        'system': 'Food Court Prepaid Card Management System',
        'version': '1.0.0',
        'endpoints': {
            'admin': '/admin/',
            'auth': '/api/auth/',
            'cards': '/api/cards/',
            'vendors': '/api/vendors/',
            'orders': '/api/orders/',
            'transactions': '/api/transactions/',
        },
        'frontend': 'Run the React app at http://localhost:5173',
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('foodcourt.core.urls')),
    path('api/cards/', include('foodcourt.cards.urls')),
    path('api/vendors/', include('foodcourt.vendors.urls')),
    path('api/orders/', include('foodcourt.orders.urls')),
    path('api/transactions/', include('foodcourt.transactions.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

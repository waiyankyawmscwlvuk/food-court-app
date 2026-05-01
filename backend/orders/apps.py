from django.apps import AppConfig
class AppConf(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'foodcourt.orders'
    label = 'orders'

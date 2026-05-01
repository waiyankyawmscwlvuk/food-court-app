"""
Management command to seed the database with initial demo data.
Run with: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from foodcourt.core.models import User
from foodcourt.vendors.models import Vendor, FoodItem


class Command(BaseCommand):
    help = 'Seed database with demo users, vendors, and food items'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # Create users
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin', password='admin1234',
                email='admin@foodcourt.com', role=User.Role.ADMIN,
                first_name='Admin', last_name='User',
            )
            self.stdout.write(self.style.SUCCESS('  Created admin user (admin / admin1234)'))

        if not User.objects.filter(username='counter1').exists():
            User.objects.create_user(
                username='counter1', password='counter1234',
                email='counter1@foodcourt.com', role=User.Role.COUNTER,
                first_name='Ko', last_name='Aung',
            )
            self.stdout.write(self.style.SUCCESS('  Created counter staff (counter1 / counter1234)'))

        if not User.objects.filter(username='vendor1').exists():
            vendor_user = User.objects.create_user(
                username='vendor1', password='vendor1234',
                email='vendor1@foodcourt.com', role=User.Role.VENDOR,
                first_name='Ma', last_name='Moe',
            )
            self.stdout.write(self.style.SUCCESS('  Created vendor user (vendor1 / vendor1234)'))
        else:
            vendor_user = User.objects.get(username='vendor1')

        # Create vendors
        stalls = [
            {'name': 'Shan Noodles', 'stall_number': 'A01', 'description': 'Traditional Shan noodle dishes'},
            {'name': 'Mohinga King', 'stall_number': 'A02', 'description': 'Authentic Myanmar fish noodle soup'},
            {'name': 'Rice & Curry House', 'stall_number': 'B01', 'description': 'Home-style rice and curry'},
            {'name': 'Tea & Snacks', 'stall_number': 'B02', 'description': 'Myanmar tea shop and snacks'},
        ]

        menus = {
            'A01': [
                ('Shan Noodles (Dry)', 2500),
                ('Shan Noodles (Soup)', 2500),
                ('Tofu Noodles', 2000),
                ('Extra Tofu', 500),
            ],
            'A02': [
                ('Mohinga (Small)', 1500),
                ('Mohinga (Large)', 2000),
                ('Mohinga with Egg', 2200),
            ],
            'B01': [
                ('Rice + 1 Curry', 2000),
                ('Rice + 2 Curries', 3000),
                ('Fried Rice', 2500),
                ('Plain Rice', 500),
            ],
            'B02': [
                ('Myanmar Milk Tea', 500),
                ('Green Tea', 300),
                ('Samosa (2 pcs)', 600),
                ('Nan Pyar Thoke', 1000),
            ],
        }

        for stall in stalls:
            vendor, created = Vendor.objects.get_or_create(
                stall_number=stall['stall_number'],
                defaults={**stall, 'owner': vendor_user, 'is_active': True}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created vendor: {vendor.name}"))
                for item_name, price in menus.get(stall['stall_number'], []):
                    FoodItem.objects.create(
                        vendor=vendor, name=item_name,
                        price=price, is_available=True,
                    )
                self.stdout.write(f"    Added {len(menus.get(stall['stall_number'], []))} menu items")

        self.stdout.write(self.style.SUCCESS('\nDatabase seeded successfully!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  Admin:   admin / admin1234')
        self.stdout.write('  Counter: counter1 / counter1234')
        self.stdout.write('  Vendor:  vendor1 / vendor1234')

from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from foodcourt.core.models import User
from foodcourt.cards.models import PrepaidCard
from foodcourt.vendors.models import Vendor, FoodItem
from foodcourt.transactions.models import Transaction


class TopUpTests(TestCase):
    """Tests for card top-up functionality."""

    def setUp(self):
        self.client = APIClient()
        self.counter = User.objects.create_user(username='counter', password='pass', role=User.Role.COUNTER)
        self.card = PrepaidCard.objects.create(
            card_number='FC12345678',
            customer_name='Test User',
            balance=Decimal('0.00'),
            status='active',
            created_by=self.counter,
        )

    def test_topup_cash(self):
        """Counter can top up a card with cash."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('topup'), {
            'card_uid': str(self.card.uid),
            'amount': '50.00',
            'payment_method': 'cash',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, Decimal('50.00'))

    def test_topup_increases_balance(self):
        """Multiple top-ups accumulate correctly."""
        self.client.force_authenticate(user=self.counter)
        for amount in ['20.00', '30.00', '50.00']:
            self.client.post(reverse('topup'), {
                'card_uid': str(self.card.uid),
                'amount': amount,
                'payment_method': 'cash',
            })
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, Decimal('100.00'))

    def test_topup_creates_transaction_record(self):
        """Top-up creates a transaction record."""
        self.client.force_authenticate(user=self.counter)
        self.client.post(reverse('topup'), {
            'card_uid': str(self.card.uid),
            'amount': '100.00',
            'payment_method': 'digital_wallet',
        })
        self.assertEqual(Transaction.objects.filter(
            card=self.card,
            transaction_type=Transaction.TransactionType.TOPUP,
        ).count(), 1)

    def test_topup_inactive_card_fails(self):
        """Cannot top up an inactive card."""
        self.card.status = 'inactive'
        self.card.save()
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('topup'), {
            'card_uid': str(self.card.uid),
            'amount': '50.00',
            'payment_method': 'cash',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_topup_invalid_card_fails(self):
        """Cannot top up with a non-existent card UID."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('topup'), {
            'card_uid': '00000000-0000-0000-0000-000000000000',
            'amount': '50.00',
            'payment_method': 'cash',
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PurchaseOrderTests(TestCase):
    """Tests for food purchase using prepaid card."""

    def setUp(self):
        self.client = APIClient()
        self.counter = User.objects.create_user(username='counter', password='pass', role=User.Role.COUNTER)
        self.card = PrepaidCard.objects.create(
            card_number='FC99999999',
            customer_name='Test Customer',
            balance=Decimal('100.00'),
            status='active',
            created_by=self.counter,
        )
        self.vendor = Vendor.objects.create(name='Test Stall', stall_number='A01')
        self.food1 = FoodItem.objects.create(
            vendor=self.vendor, name='Nasi Lemak', price=Decimal('5.00'), is_available=True
        )
        self.food2 = FoodItem.objects.create(
            vendor=self.vendor, name='Teh Tarik', price=Decimal('2.00'), is_available=True
        )

    def test_purchase_deducts_balance(self):
        """Purchasing food deducts the correct amount from card balance."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('order_create'), {
            'card_uid': str(self.card.uid),
            'vendor_id': self.vendor.id,
            'items': [
                {'food_item_id': self.food1.id, 'quantity': 2},
                {'food_item_id': self.food2.id, 'quantity': 1},
            ],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.card.refresh_from_db()
        # 2 * 5.00 + 1 * 2.00 = 12.00; 100.00 - 12.00 = 88.00
        self.assertEqual(self.card.balance, Decimal('88.00'))

    def test_purchase_insufficient_balance(self):
        """Purchase is rejected when balance is insufficient."""
        self.card.balance = Decimal('5.00')
        self.card.save()
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('order_create'), {
            'card_uid': str(self.card.uid),
            'vendor_id': self.vendor.id,
            'items': [{'food_item_id': self.food1.id, 'quantity': 5}],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient', response.data['error'])

    def test_purchase_creates_transaction(self):
        """Successful purchase creates a PURCHASE transaction record."""
        self.client.force_authenticate(user=self.counter)
        self.client.post(reverse('order_create'), {
            'card_uid': str(self.card.uid),
            'vendor_id': self.vendor.id,
            'items': [{'food_item_id': self.food1.id, 'quantity': 1}],
        }, format='json')
        self.assertEqual(Transaction.objects.filter(
            card=self.card,
            transaction_type=Transaction.TransactionType.PURCHASE,
        ).count(), 1)

    def test_purchase_inactive_card_rejected(self):
        """Cannot purchase with inactive card."""
        self.card.status = 'inactive'
        self.card.save()
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('order_create'), {
            'card_uid': str(self.card.uid),
            'vendor_id': self.vendor.id,
            'items': [{'food_item_id': self.food1.id, 'quantity': 1}],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ReportTests(TestCase):
    """Tests for reporting endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.counter = User.objects.create_user(username='counter', password='pass', role=User.Role.COUNTER)

    def test_daily_report_returns_data(self):
        """Daily report endpoint returns expected keys."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('daily_report'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ['date', 'total_topup', 'total_sales', 'topup_count', 'purchase_count']:
            self.assertIn(key, response.data)

    def test_topup_report_returns_data(self):
        """Top-up report endpoint returns expected keys."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('topup_report'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_topup', response.data)
        self.assertIn('by_payment_method', response.data)

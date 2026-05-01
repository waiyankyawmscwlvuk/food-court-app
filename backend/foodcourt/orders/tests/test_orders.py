from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from foodcourt.core.models import User
from foodcourt.cards.models import PrepaidCard
from foodcourt.vendors.models import Vendor, FoodItem
from foodcourt.transactions.models import Transaction
from foodcourt.orders.models import Order, OrderItem


# Suppress QR code file I/O in any card creation during order tests
QR_PATCH = patch(
    'foodcourt.cards.views.PrepaidCardListCreateView._generate_qr_code',
    return_value=None,
)


class OrderTests(TestCase):
    """Tests for food purchase / order processing."""

    def setUp(self):
        self.client  = APIClient()
        self.counter = User.objects.create_user(username='counter', password='pass', role=User.Role.COUNTER)
        self.vendor_user = User.objects.create_user(username='vendor', password='pass', role=User.Role.VENDOR)
        self.admin   = User.objects.create_user(username='admin',   password='pass', role=User.Role.ADMIN)

        # Card with enough balance for most tests
        self.card = PrepaidCard.objects.create(
            card_number='FC11111111',
            customer_name='Test Customer',
            customer_phone='09111111111',
            balance=Decimal('100000.00'),
            status='active',
            created_by=self.counter,
        )

        # Active vendor with two food items
        self.vendor = Vendor.objects.create(
            name='Test Stall',
            stall_number='T01',
            is_active=True,
        )
        self.item1 = FoodItem.objects.create(
            vendor=self.vendor,
            name='Shan Noodles',
            price=Decimal('2500.00'),
            is_available=True,
        )
        self.item2 = FoodItem.objects.create(
            vendor=self.vendor,
            name='Teh Tarik',
            price=Decimal('500.00'),
            is_available=True,
        )

        # Inactive vendor for negative tests
        self.inactive_vendor = Vendor.objects.create(
            name='Closed Stall',
            stall_number='Z99',
            is_active=False,
        )

        # Unavailable food item
        self.unavailable_item = FoodItem.objects.create(
            vendor=self.vendor,
            name='Sold Out Item',
            price=Decimal('1000.00'),
            is_available=False,
        )

    def _order(self, card_uid=None, vendor_id=None, items=None):
        """Helper: POST to order create endpoint as counter staff."""
        self.client.force_authenticate(user=self.counter)
        return self.client.post(
            reverse('order_create'),
            {
                'card_uid':  str(card_uid  or self.card.uid),
                'vendor_id': vendor_id or self.vendor.id,
                'items':     items or [{'food_item_id': self.item1.id, 'quantity': 1}],
            },
            format='json',
        )

    # ── success ───────────────────────────────────────────────────────────────
    def test_order_returns_201(self):
        """Successful order returns HTTP 201."""
        response = self._order()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_order_number_format(self):
        """Order number is auto-generated with ORD prefix."""
        response = self._order()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_number = response.data['order_number']
        self.assertTrue(
            order_number.startswith('ORD'),
            msg=f"Expected ORD prefix, got: {order_number}"
        )
        self.assertEqual(len(order_number), 11)  # ORD + 8 digits

    def test_order_status_is_completed(self):
        """Successful order has completed status."""
        response = self._order()
        self.assertEqual(response.data['status'], 'completed')

    def test_order_deducts_correct_amount_single_item(self):
        """Balance is deducted by item price × quantity."""
        # 1 × Shan Noodles = 2500
        response = self._order(items=[{'food_item_id': self.item1.id, 'quantity': 1}])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, Decimal('97500.00'))

    def test_order_deducts_correct_amount_multiple_items(self):
        """Balance deduction is correct when ordering multiple different items."""
        # 2 × Shan Noodles (5000) + 3 × Teh Tarik (1500) = 6500
        response = self._order(items=[
            {'food_item_id': self.item1.id, 'quantity': 2},
            {'food_item_id': self.item2.id, 'quantity': 3},
        ])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, Decimal('93500.00'))

    def test_order_deducts_correct_amount_high_quantity(self):
        """Balance deduction is correct for large quantities."""
        # 10 × Teh Tarik = 5000
        response = self._order(items=[{'food_item_id': self.item2.id, 'quantity': 10}])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, Decimal('95000.00'))

    def test_order_total_amount_matches_items(self):
        """total_amount in response equals sum of item subtotals."""
        response = self._order(items=[
            {'food_item_id': self.item1.id, 'quantity': 2},
            {'food_item_id': self.item2.id, 'quantity': 1},
        ])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        expected_total = Decimal('2500.00') * 2 + Decimal('500.00') * 1  # 5500
        self.assertEqual(Decimal(response.data['total_amount']), expected_total)

    def test_order_balance_before_and_after_are_correct(self):
        """balance_before and balance_after in response are accurate."""
        balance_before = self.card.balance
        response = self._order(items=[{'food_item_id': self.item1.id, 'quantity': 1}])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['balance_before']), balance_before)
        self.assertEqual(
            Decimal(response.data['balance_after']),
            balance_before - Decimal('2500.00'),
        )

    def test_order_items_are_returned_in_response(self):
        """Order response includes the list of ordered items."""
        response = self._order(items=[
            {'food_item_id': self.item1.id, 'quantity': 2},
            {'food_item_id': self.item2.id, 'quantity': 1},
        ])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        items = response.data['items']
        self.assertEqual(len(items), 2)
        # Item names are snapshotted at time of order
        item_names = [i['food_item_name'] for i in items]
        self.assertIn('Shan Noodles', item_names)
        self.assertIn('Teh Tarik', item_names)

    def test_order_item_price_snapshot(self):
        """Unit price in order item is snapshotted, not live from FoodItem."""
        response = self._order(items=[{'food_item_id': self.item1.id, 'quantity': 1}])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_item = response.data['items'][0]
        self.assertEqual(Decimal(order_item['unit_price']), self.item1.price)

    def test_order_creates_purchase_transaction(self):
        """A PURCHASE Transaction record is created after a successful order."""
        self._order()
        count = Transaction.objects.filter(
            card=self.card,
            transaction_type=Transaction.TransactionType.PURCHASE,
        ).count()
        self.assertEqual(count, 1)

    def test_order_transaction_amount_is_correct(self):
        """The PURCHASE transaction records the correct amount."""
        self._order(items=[{'food_item_id': self.item1.id, 'quantity': 3}])
        txn = Transaction.objects.get(
            card=self.card,
            transaction_type=Transaction.TransactionType.PURCHASE,
        )
        self.assertEqual(txn.amount, Decimal('7500.00'))

    def test_order_creates_order_items_in_db(self):
        """OrderItem rows are persisted to the database."""
        response = self._order(items=[
            {'food_item_id': self.item1.id, 'quantity': 1},
            {'food_item_id': self.item2.id, 'quantity': 2},
        ])
        order = Order.objects.get(pk=response.data['id'])
        self.assertEqual(order.items.count(), 2)

    def test_order_linked_to_transaction(self):
        """Order has a one-to-one link to its PURCHASE Transaction."""
        response = self._order()
        order = Order.objects.get(pk=response.data['id'])
        self.assertIsNotNone(order.transaction)
        self.assertEqual(order.transaction.transaction_type, Transaction.TransactionType.PURCHASE)

    def test_multiple_orders_accumulate_deductions(self):
        """Sequential orders each deduct from the running balance."""
        self._order(items=[{'food_item_id': self.item1.id, 'quantity': 1}])  # -2500
        self._order(items=[{'food_item_id': self.item2.id, 'quantity': 2}])  # -1000
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, Decimal('96500.00'))

    # ── rejection: balance ────────────────────────────────────────────────────
    def test_insufficient_balance_returns_400(self):
        """Purchase exceeding card balance is rejected with 400."""
        response = self._order(
            items=[{'food_item_id': self.item1.id, 'quantity': 99999}]
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_insufficient_balance_error_message(self):
        """Error response mentions 'Insufficient' balance."""
        response = self._order(
            items=[{'food_item_id': self.item1.id, 'quantity': 99999}]
        )
        self.assertIn('Insufficient', response.data.get('error', ''))

    def test_insufficient_balance_does_not_deduct(self):
        """Rejected order does not change the card balance."""
        original_balance = self.card.balance
        self._order(items=[{'food_item_id': self.item1.id, 'quantity': 99999}])
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, original_balance)

    def test_insufficient_balance_creates_no_transaction(self):
        """No Transaction record is created when order is rejected."""
        self._order(items=[{'food_item_id': self.item1.id, 'quantity': 99999}])
        self.assertEqual(
            Transaction.objects.filter(card=self.card).count(), 0
        )

    def test_exact_balance_order_succeeds(self):
        """Order that costs exactly the remaining balance succeeds."""
        # Set balance exactly to cost of 1 item
        self.card.balance = Decimal('2500.00')
        self.card.save()
        response = self._order(items=[{'food_item_id': self.item1.id, 'quantity': 1}])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.card.refresh_from_db()
        self.assertEqual(self.card.balance, Decimal('0.00'))

    # ── rejection: card state ─────────────────────────────────────────────────
    def test_inactive_card_purchase_rejected(self):
        """Purchase with inactive card returns 400."""
        self.card.status = 'inactive'
        self.card.save()
        response = self._order()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_card_uid_returns_404(self):
        """Order with unknown card UID returns 404."""
        response = self._order(card_uid='00000000-0000-0000-0000-000000000000')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── rejection: vendor / item state ────────────────────────────────────────
    def test_inactive_vendor_rejected(self):
        """Order for an inactive vendor returns 404."""
        response = self._order(
            vendor_id=self.inactive_vendor.id,
            items=[{'food_item_id': self.item1.id, 'quantity': 1}],
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unavailable_food_item_rejected(self):
        """Order containing an unavailable food item is rejected."""
        response = self._order(
            items=[{'food_item_id': self.unavailable_item.id, 'quantity': 1}]
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_item_from_wrong_vendor_rejected(self):
        """Food item that belongs to a different vendor is rejected."""
        other_vendor = Vendor.objects.create(name='Other', stall_number='O01', is_active=True)
        other_item   = FoodItem.objects.create(
            vendor=other_vendor, name='Other Food',
            price=Decimal('1000.00'), is_available=True,
        )
        # Order from self.vendor but send an item owned by other_vendor
        response = self._order(
            vendor_id=self.vendor.id,
            items=[{'food_item_id': other_item.id, 'quantity': 1}],
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_zero_quantity_rejected(self):
        """Quantity of zero or less should be rejected."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(
            reverse('order_create'),
            {
                'card_uid':  str(self.card.uid),
                'vendor_id': self.vendor.id,
                'items':     [{'food_item_id': self.item1.id, 'quantity': 0}],
            },
            format='json',
        )
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_empty_items_list_rejected(self):
        """Order with no items is rejected."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(
            reverse('order_create'),
            {
                'card_uid':  str(self.card.uid),
                'vendor_id': self.vendor.id,
                'items':     [],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── permissions ───────────────────────────────────────────────────────────
    def test_vendor_cannot_create_order(self):
        """Vendor role cannot place orders."""
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.post(
            reverse('order_create'),
            {
                'card_uid':  str(self.card.uid),
                'vendor_id': self.vendor.id,
                'items':     [{'food_item_id': self.item1.id, 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_order(self):
        """Unauthenticated request is rejected with 401."""
        self.client.force_authenticate(user=None)
        response = self.client.post(
            reverse('order_create'),
            {
                'card_uid':  str(self.card.uid),
                'vendor_id': self.vendor.id,
                'items':     [{'food_item_id': self.item1.id, 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_create_order(self):
        """Admin role can also create orders."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse('order_create'),
            {
                'card_uid':  str(self.card.uid),
                'vendor_id': self.vendor.id,
                'items':     [{'food_item_id': self.item1.id, 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ── list / detail ─────────────────────────────────────────────────────────
    def test_list_orders(self):
        """Authenticated user can list orders."""
        self._order()
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('order_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_get_order_detail(self):
        """Counter can retrieve a single order by ID."""
        create_resp = self._order()
        order_id = create_resp.data['id']
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('order_detail', args=[order_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], order_id)
        self.assertIn('items', response.data)

    def test_filter_orders_by_date(self):
        """Orders can be filtered by date."""
        self._order()
        from datetime import date
        self.client.force_authenticate(user=self.counter)
        today = date.today().isoformat()
        response = self.client.get(reverse('order_list'), {'date': today})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_filter_orders_by_vendor(self):
        """Orders can be filtered by vendor."""
        self._order()
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('order_list'), {'vendor': self.vendor.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for order in response.data:
            self.assertEqual(order['vendor'], self.vendor.id)

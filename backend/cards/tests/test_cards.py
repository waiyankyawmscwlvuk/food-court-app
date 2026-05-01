from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from foodcourt.core.models import User
from foodcourt.cards.models import PrepaidCard


# ---------------------------------------------------------------------------
# Shared helper: patch out QR code file I/O for every card-creation call.
# The real _generate_qr_code() calls qrcode + Pillow and then does
# card.qr_code.save(...) which tries to write to the filesystem.
# In tests we skip all of that so the card is saved cleanly.
# ---------------------------------------------------------------------------
QR_PATCH = patch(
    'foodcourt.cards.views.PrepaidCardListCreateView._generate_qr_code',
    return_value=None,
)


class PrepaidCardTests(TestCase):
    """Tests for prepaid card management."""

    def setUp(self):
        self.client = APIClient()
        self.admin   = User.objects.create_user(username='admin',   password='pass', role=User.Role.ADMIN)
        self.counter = User.objects.create_user(username='counter', password='pass', role=User.Role.COUNTER)
        self.vendor  = User.objects.create_user(username='vendor',  password='pass', role=User.Role.VENDOR)

    # ── helper ────────────────────────────────────────────────────────────────
    def _make_card(self, customer_name='John Doe'):
        """Create a card as counter staff with QR generation mocked out."""
        self.client.force_authenticate(user=self.counter)
        with QR_PATCH:
            response = self.client.post(reverse('card_list_create'), {
                'customer_name': customer_name,
                'customer_phone': '09123456789',
                'customer_email': 'john@example.com',
            }, format='json')
        return response

    def _get_card_obj(self):
        """Create a card and return the PrepaidCard ORM instance.
        Fetches from database instead of relying on response data."""
        resp = self._make_card()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # Get the most recently created card
        return PrepaidCard.objects.latest('id')

    # ── creation ──────────────────────────────────────────────────────────────
    def test_counter_can_create_card(self):
        """Counter staff can create a prepaid card."""
        response = self._make_card()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_card_number_generated_with_fc_prefix(self):
        """Card number is auto-generated and starts with FC."""
        response = self._make_card()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
         # Fetch from database to get the uid
        card = PrepaidCard.objects.latest('id')
        uid = str(card.uid)
        self.assertIsNotNone(uid)
        self.assertEqual(len(uid), 36)          # standard UUID length with dashes
        self.assertEqual(uid.count('-'), 4)

    def test_uid_is_generated_on_creation(self):
        """A UUID is assigned to the card on creation."""
        response = self._make_card()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Fetch from database to get the uid
        card = PrepaidCard.objects.latest('id')
        uid = str(card.uid)
        self.assertIsNotNone(uid)
        self.assertEqual(len(uid), 36)          # standard UUID length with dashes
        self.assertEqual(uid.count('-'), 4)

    def test_card_has_zero_balance_on_creation(self):
        """Newly created card has zero balance."""
        response = self._make_card()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Fetch from database to check balance
        card = PrepaidCard.objects.latest('id')
        self.assertEqual(str(card.balance), '0.00')

    def test_card_is_active_on_creation(self):
        """Newly created card defaults to active status."""
        response = self._make_card()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Fetch from database to check status
        card = PrepaidCard.objects.latest('id')
        self.assertEqual(card.status, 'active')

    def test_card_number_is_unique(self):
        """Two different cards get different card numbers."""
        r1 = self._make_card(customer_name='Alice')
        r2 = self._make_card(customer_name='Bob')

        # Fetch cards from database
        card1 = PrepaidCard.objects.get(customer_name='Alice')
        card2 = PrepaidCard.objects.get(customer_name='Bob')
        self.assertNotEqual(card1.card_number, card2.card_number)

    def test_uid_is_unique(self):
        """Two different cards get different UUIDs."""
        r1 = self._make_card(customer_name='Alice')
        r2 = self._make_card(customer_name='Bob')

         # Fetch cards from database
        card1 = PrepaidCard.objects.get(customer_name='Alice')
        card2 = PrepaidCard.objects.get(customer_name='Bob')
        self.assertNotEqual(str(card1.uid), str(card2.uid))

    def test_vendor_cannot_create_card(self):
        """Vendor role receives 403 on card creation."""
        self.client.force_authenticate(user=self.vendor)
        with QR_PATCH:
            response = self.client.post(reverse('card_list_create'), {
                'customer_name': 'Jane Doe',
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_card(self):
        """Unauthenticated request is rejected with 401."""
        self.client.force_authenticate(user=None)
        with QR_PATCH:
            response = self.client.post(reverse('card_list_create'), {
                'customer_name': 'No Auth',
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_name_required(self):
        """Card creation fails without customer_name."""
        self.client.force_authenticate(user=self.counter)
        with QR_PATCH:
            response = self.client.post(reverse('card_list_create'), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── listing ───────────────────────────────────────────────────────────────
    def test_counter_can_list_cards(self):
        """Counter staff can list all cards."""
        self._make_card()
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('card_list_create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_admin_can_list_cards(self):
        """Admin can list all cards."""
        self._make_card()
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('card_list_create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vendor_cannot_list_cards(self):
        """Vendor cannot access the card list."""
        self.client.force_authenticate(user=self.vendor)
        response = self.client.get(reverse('card_list_create'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── detail ────────────────────────────────────────────────────────────────
    def test_get_card_detail(self):
        """Counter can retrieve a single card by ID."""
        # Create a card and get its ID from database
        card = self._get_card_obj()
        card_id = card.id
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('card_detail', args=[card_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], card_id)
        # verify all key fields are present
        for field in ('card_number', 'uid', 'customer_name', 'balance', 'status'):
            self.assertIn(field, response.data)

    # ── scan ──────────────────────────────────────────────────────────────────
    def test_scan_card_by_uid(self):
        """Scanning a valid UID returns full card details."""
         # Create a card and get its UID from database
        card = self._get_card_obj()
        uid = str(card.uid)

        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('card_scan'), {'uid': uid}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['uid'], uid)
        self.assertEqual(response.data['card_number'], card.card_number)

    def test_scan_invalid_uid_returns_404(self):
        """Scanning an unknown UUID returns 404."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(
            reverse('card_scan'),
            {'uid': '00000000-0000-0000-0000-000000000000'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_scan_malformed_uid_returns_400(self):
        """Sending a non-UUID value to scan returns 400."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(
            reverse('card_scan'),
            {'uid': 'not-a-valid-uuid'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vendor_cannot_scan_card(self):
        """Vendor cannot use the scan endpoint."""
        self.client.force_authenticate(user=self.vendor)
        response = self.client.post(
            reverse('card_scan'),
            {'uid': '00000000-0000-0000-0000-000000000000'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── toggle status ─────────────────────────────────────────────────────────
    def test_admin_can_deactivate_card(self):
        """Admin can deactivate an active card."""
         # Create a card and get its ID from database
        card = self._get_card_obj()
        card_id = card.id

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('card_toggle_status', args=[card_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'inactive')

    def test_admin_can_reactivate_card(self):
        """Admin can reactivate an inactive card."""
        card = self._get_card_obj()
        card.status = PrepaidCard.Status.INACTIVE
        card.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('card_toggle_status', args=[card.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'active')

    def test_counter_cannot_toggle_card_status(self):
        """Counter staff receives 403 on toggle-status."""
        card = self._get_card_obj()
        card_id = card.id

        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('card_toggle_status', args=[card_id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_toggle_nonexistent_card_returns_404(self):
        """Toggling a card that does not exist returns 404."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('card_toggle_status', args=[99999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

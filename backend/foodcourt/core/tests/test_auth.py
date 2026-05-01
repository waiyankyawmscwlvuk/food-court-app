from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from foodcourt.core.models import User


class AuthenticationTests(TestCase):
    """Tests for authentication endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='adminpass123', role=User.Role.ADMIN
        )
        self.counter = User.objects.create_user(
            username='counter', password='counterpass123', role=User.Role.COUNTER
        )
        self.vendor = User.objects.create_user(
            username='vendor', password='vendorpass123', role=User.Role.VENDOR
        )

    def test_login_success(self):
        """User can log in with valid credentials."""
        response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'admin', 'password': 'adminpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'admin')

    def test_login_wrong_password(self):
        """Login fails with wrong password."""
        response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'admin', 'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_me(self):
        """Authenticated user can get their own profile."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin')

    def test_me_unauthenticated(self):
        """Unauthenticated request to /me/ returns 401."""
        response = self.client.get(reverse('me'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_list_users(self):
        """Admin can list all users."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('user_list_create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_list_users(self):
        """Counter staff cannot list users."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.get(reverse('user_list_create'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user(self):
        """Admin can create a new user."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('user_list_create'), {
            'username': 'newstaff',
            'password': 'newpass123',
            'role': 'counter',
            'email': 'newstaff@example.com',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_change_password(self):
        """User can change their own password."""
        self.client.force_authenticate(user=self.counter)
        response = self.client.post(reverse('change_password'), {
            'old_password': 'counterpass123',
            'new_password': 'newpassword456',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RoleTests(TestCase):
    """Tests for role-based access."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin', password='pass', role=User.Role.ADMIN)
        self.counter = User.objects.create_user(username='counter', password='pass', role=User.Role.COUNTER)
        self.vendor_user = User.objects.create_user(username='vendor', password='pass', role=User.Role.VENDOR)

    def test_admin_role_properties(self):
        self.assertTrue(self.admin.is_admin)
        self.assertFalse(self.admin.is_counter)
        self.assertFalse(self.admin.is_vendor)

    def test_counter_role_properties(self):
        self.assertFalse(self.counter.is_admin)
        self.assertTrue(self.counter.is_counter)

    def test_vendor_role_properties(self):
        self.assertFalse(self.vendor_user.is_admin)
        self.assertTrue(self.vendor_user.is_vendor)

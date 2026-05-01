from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class IsAdminOrCounter(BasePermission):
    """Allow access to admin and counter staff."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_admin or request.user.is_counter
        )


class IsAdminOrVendor(BasePermission):
    """Allow access to admin and vendor."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_admin or request.user.is_vendor
        )

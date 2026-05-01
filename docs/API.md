# Food Court API Documentation

Base URL: `http://localhost:8000/api`

All endpoints (except login) require:
```
Authorization: Bearer <access_token>
```

---

## Authentication

### POST /auth/login/
Login and get JWT tokens.
```json
{ "username": "admin", "password": "admin1234" }
```
Response: `{ "access": "...", "refresh": "...", "user": { "id", "username", "role", ... } }`

### POST /auth/refresh/
Refresh access token.
```json
{ "refresh": "<refresh_token>" }
```

### GET /auth/me/
Get current user profile.

### POST /auth/change-password/
```json
{ "old_password": "...", "new_password": "..." }
```

### GET /auth/users/  *(Admin only)*
List all users.

### POST /auth/users/  *(Admin only)*
Create a user.
```json
{ "username": "staff1", "password": "pass1234", "role": "counter", "email": "..." }
```

### PATCH /auth/users/{id}/  *(Admin only)*
Update a user.

### DELETE /auth/users/{id}/  *(Admin only)*
Delete a user.

---

## Prepaid Cards

### GET /cards/
List all cards. *(Admin, Counter)*

### POST /cards/
Create a new card. *(Admin, Counter)*
```json
{ "customer_name": "John Doe", "customer_phone": "09123456789", "customer_email": "john@example.com" }
```

### GET /cards/{id}/
Get card details.

### PATCH /cards/{id}/
Update card info (name, phone, email).

### POST /cards/{id}/toggle-status/
Activate or deactivate a card. *(Admin only)*

### POST /cards/scan/
Find card by QR UID. *(Admin, Counter)*
```json
{ "uid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

---

## Vendors & Food Items

### GET /vendors/
List all vendors.

### POST /vendors/  *(Admin only)*
Create a vendor.
```json
{ "name": "Shan Noodles", "stall_number": "A01", "description": "..." }
```

### GET /vendors/{id}/
Get vendor with food items.

### PATCH /vendors/{id}/  *(Admin only)*
Update vendor.

### DELETE /vendors/{id}/  *(Admin only)*
Delete vendor.

### GET /vendors/food-items/?vendor={id}
List food items (filter by vendor optional).

### POST /vendors/food-items/  *(Admin, Vendor)*
Create food item.
```json
{ "vendor": 1, "name": "Shan Noodles", "price": "2500.00", "is_available": true }
```

### PATCH /vendors/food-items/{id}/  *(Admin, Vendor)*
Update food item.

### DELETE /vendors/food-items/{id}/  *(Admin, Vendor)*
Delete food item.

---

## Orders (Purchase)

### GET /orders/
List orders. Supports `?card=`, `?vendor=`, `?date=YYYY-MM-DD`.

### POST /orders/create/  *(Admin, Counter)*
Place a food order using a prepaid card.
```json
{
  "card_uid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "vendor_id": 1,
  "items": [
    { "food_item_id": 1, "quantity": 2 },
    { "food_item_id": 2, "quantity": 1 }
  ]
}
```
Returns order details including `order_number`, `total_amount`, `balance_after`.

### GET /orders/{id}/
Get order details with items.

---

## Transactions

### GET /transactions/
List all transactions. Supports `?type=topup|purchase`, `?card=`, `?date=YYYY-MM-DD`.

### POST /transactions/topup/  *(Admin, Counter)*
Top up a prepaid card.
```json
{
  "card_uid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "amount": 50000,
  "payment_method": "cash",
  "note": "Optional note"
}
```
`payment_method`: `cash` | `digital_wallet` | `bank_card`

### GET /transactions/receipt/{order_id}/
Download PDF receipt for an order.

### GET /transactions/reports/daily/?date=YYYY-MM-DD
Daily financial summary report.

Response:
```json
{
  "date": "2024-01-15",
  "total_topup": 500000,
  "total_sales": 125000,
  "total_transactions": 42,
  "topup_count": 20,
  "purchase_count": 22,
  "topup_by_payment_method": [...],
  "vendor_sales": [...]
}
```

### GET /transactions/reports/topup/?date=YYYY-MM-DD
Top-up report with breakdown by payment method and full transaction list.

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 500 | Server error |

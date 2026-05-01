# Food Court Prepaid Card Management System

A web-based food court management system with QR code prepaid cards and multi-payment top-up support.

## Student
**Name:** Wai Yan Kyaw  
**Project:** Web-Based Food Court Prepaid Card Management System with QR Code and Multi-Payment Top-Up

## Tech Stack
- **Frontend:** React.js, Tailwind CSS, Vite
- **Backend:** Python, Django, Django REST Framework, JWT Authentication
- **Database:** PostgreSQL (SQLite for development)

## Architecture
```
Frontend (React.js)
      ↓
REST API (Django REST Framework)
      ↓
PostgreSQL Database
```

## Modules
- `core` – Authentication and roles
- `cards` – QR prepaid card management
- `vendors` – Food management
- `orders` – Purchase processing
- `transactions` – Financial records and reporting

## Setup Instructions

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## User Roles
- **Administrator** – Full system access
- **Counter Staff** – Manage cards and top-ups
- **Vendor** – Manage food items and view sales

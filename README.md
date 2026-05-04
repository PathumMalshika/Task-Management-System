# Task Management System

A full-stack task management web application built with **PHP**, **MySQL**, and **React**.
Features role-based access control, JWT authentication, email notifications, audit logging,
and a clean professional light theme UI.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Routes](#api-routes)
- [Role Permissions](#role-permissions)
- [Email Notifications](#email-notifications)
- [Security](#security)
- [Production Deployment](#production-deployment)

---

## Features

- **JWT Authentication** — Access tokens (15 min) + refresh tokens with auto-rotation
- **Role-Based Access Control** — Three-tier role hierarchy: Admin, Manager, Technician
- **Task Management** — Create, assign, update, and delete tasks with priority and due dates
- **User Management** — Admin can create and manage user accounts
- **Email Notifications** — Automatic email sent when a task is assigned via Gmail SMTP
- **Audit Logging** — Full system activity log with IP address and user agent tracking
- **Inactivity Auto-Logout** — Logs out after 30 minutes of inactivity with a 2-minute warning
- **Roles Configuration** — Centralised role config file for easy role management
- **Responsive UI** — Works on desktop and mobile with a collapsible sidebar
- **Light Theme** — Professional light theme with customisable CSS variable system

---

## Tech Stack

### Backend

- **PHP 8.2** — Server-side language
- **MySQL 8.0** — Relational database
- **firebase/php-jwt** — JWT token generation and validation
- **PHPMailer 7** — Email sending via SMTP
- **vlucas/phpdotenv** — Environment variable management
- **Monolog** — Rotating log files

### Frontend

- **React 18** — UI library
- **Vite** — Build tool and dev server
- **React Router DOM v6** — Client-side routing
- **Axios** — HTTP client with JWT interceptors
- **Lucide React** — Icon library

---

## Project Structure

```
Task_Management_System/
├── README.md
│
├── backend/
│   ├── public/
│   │   └── index.php              ← Entry point and router
│   ├── src/
│   │   ├── Config/
│   │   │   └── Database.php       ← MySQL PDO connection
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── TaskController.php
│   │   │   ├── UserController.php
│   │   │   └── AuditController.php
│   │   ├── Middleware/
│   │   │   ├── AuthMiddleware.php
│   │   │   ├── AuthorizeMiddleware.php
│   │   │   └── LoggerMiddleware.php
│   │   ├── Models/
│   │   │   └── AuditLog.php
│   │   ├── Services/
│   │   │   ├── AuthService.php
│   │   │   └── EmailService.php
│   │   └── Utils/
│   │       ├── JWT.php
│   │       └── Response.php
│   ├── logs/
│   ├── composer.json
│   ├── schema.sql
│   ├── .env.example
│   └── .gitignore
│
└── frontend/
    ├── src/
    │   ├── config/
    │   │   └── roles.js           ← Centralised role configuration
    │   ├── contexts/
    │   │   ├── AuthContext.jsx    ← Auth state + inactivity timer
    │   │   └── ToastContext.jsx   ← Toast notifications
    │   ├── services/
    │   │   └── api.js             ← Axios + JWT auto-refresh
    │   ├── utils/
    │   │   └── helpers.js         ← Formatting utilities
    │   ├── components/
    │   │   ├── Layout.jsx         ← Sidebar, topbar, navigation
    │   │   └── UI.jsx             ← Shared UI components
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── TasksPage.jsx
    │   │   ├── UsersPage.jsx
    │   │   └── AuditPage.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css              ← Full CSS design system
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    └── .gitignore
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed before starting.

- **PHP 8.2+** — via XAMPP or https://php.net
- **MySQL 8.0+** — via XAMPP or https://mysql.com
- **Composer** — https://getcomposer.org
- **Node.js 18+** — https://nodejs.org

---

### Backend Setup

**Step 1 — Install PHP dependencies**

```bash
cd backend
composer install
```

**Step 2 — Create the environment file**

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=taskmanagement
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_CHARSET=utf8mb4

JWT_SECRET=your_32_char_secret_key_here
JWT_REFRESH_SECRET=your_32_char_refresh_key_here
JWT_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=28800

APP_ENV=development
FRONTEND_URL=http://localhost:3000

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_FROM_ADDRESS=your@gmail.com
MAIL_FROM_NAME=TaskManager
MAIL_ENCRYPTION=tls
APP_URL=http://localhost:3000
```

**Step 3 — Create the database**

Open phpMyAdmin at `http://localhost/phpmyadmin` and run:

```sql
CREATE DATABASE taskmanagement CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then import `backend/schema.sql` into the database.

**Step 4 — Start the PHP development server**

```bash
php -S localhost:5000 -t public/
```

The API is now available at `http://localhost:5000/api`

---

### Frontend Setup

**Step 1 — Install npm dependencies**

```bash
cd frontend
npm install
```

**Step 2 — Create the environment file**

```bash
cp .env.example .env
```

Open `.env` and set the API URL:

```env
VITE_API_URL=http://localhost:5000/api
```

**Step 3 — Start the development server**

```bash
npm run dev
```

The app is now available at `http://localhost:3000`

---

### Running Both Together

Open two terminals and keep both running at the same time.

```bash
# Terminal 1 — Backend
cd backend
php -S localhost:5000 -t public/

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## API Routes

### Public Routes — no login required

```
POST   /api/auth/login       Login with email and password
POST   /api/auth/refresh     Refresh access token
POST   /api/auth/logout      Logout and revoke refresh token
```

### Task Routes — login required

```
GET    /api/tasks            Get tasks (filtered by role)
POST   /api/tasks            Create a task (Manager or Admin only)
PUT    /api/tasks/:id        Update a task (any role with ownership check)
DELETE /api/tasks/:id        Delete a task (Admin only)
```

### User Routes — login required

```
GET    /api/users            Get users (Manager or Admin only)
POST   /api/users            Create a user (Admin only)
PUT    /api/users/:id        Update a user (Admin only)
DELETE /api/users/:id        Delete a user (Admin only)
```

### Audit Log Routes — login required

```
GET    /api/audit-logs       Get audit logs (Admin only)
```

---

## Role Permissions

### Admin

- View all tasks across the entire system
- Create, update, and delete any task
- Create, update, and delete any user account
- View all system audit logs

### Manager

- View tasks they created or are assigned to
- Create and update tasks
- View technician user accounts
- Cannot delete tasks or manage users

### Technician

- View only tasks assigned to them
- Update the status of their own assigned tasks only
- Cannot create or delete tasks
- Cannot view users or audit logs

---

## Email Notifications

The system automatically sends an email when a task is assigned to a user.

**When it triggers:**
A new task is created with an assignee, or an existing task is reassigned to a
different user.

**Setup requirements:**

1. Enable 2-Factor Authentication on your Gmail account
2. Generate a Gmail App Password at https://myaccount.google.com/apppasswords
3. Add the App Password to `MAIL_PASSWORD` in `backend/.env`

**To test:**

Create a temporary file `backend/public/testmail.php`, visit
`http://localhost:5000/testmail.php` in the browser, and check your inbox.
Delete the test file after confirming it works.

---

## Security

- Passwords hashed with bcrypt at cost factor 12
- JWT access tokens expire in 15 minutes
- Refresh tokens stored in database and expire in 8 hours
- Expired refresh tokens cleaned up automatically on each login
- All database queries use PDO prepared statements (SQL injection proof)
- CORS restricted to the `FRONTEND_URL` environment variable
- Every protected route has role-based authorization checks
- UUID primary keys prevent sequential ID enumeration attacks
- Inactivity auto-logout after 30 minutes of no user activity

---

## Production Deployment

### Server Requirements

- Ubuntu 22.04 LTS
- Apache2
- MySQL 8
- PHP 8.2 with extensions: mysql, mbstring, xml, curl, zip, bcmath
- Composer
- Node.js 20

### Deploy Steps

**1. Install server packages**

```bash
sudo apt update
sudo apt install apache2 mysql-server php8.2 php8.2-mysql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-bcmath composer nodejs
```

**2. Enable Apache modules**

```bash
sudo a2enmod rewrite proxy proxy_http headers
sudo systemctl restart apache2
```

**3. Deploy backend**

```bash
sudo cp -r backend /var/www/taskmanager/backend
cd /var/www/taskmanager/backend
sudo composer install --no-dev
sudo cp .env.example .env
sudo nano .env
```

**4. Build and deploy frontend**

```bash
cd frontend
echo "VITE_API_URL=http://YOUR_SERVER_IP/api" > .env.production
npm install
npm run build
sudo cp -r dist /var/www/taskmanager/frontend
```

**5. Set file permissions**

```bash
sudo chown -R www-data:www-data /var/www/taskmanager
sudo chmod -R 755 /var/www/taskmanager
sudo chmod -R 775 /var/www/taskmanager/backend/logs
```

**6. Configure Apache virtual host**

Create `/etc/apache2/sites-available/taskmanager.conf` with the
`DocumentRoot` pointing to `/var/www/taskmanager/frontend` and an
`/api` Alias pointing to `/var/www/taskmanager/backend/public`.
Enable the site and reload Apache.

**7. Access the app**

Open `http://YOUR_SERVER_IP` in your browser.

---




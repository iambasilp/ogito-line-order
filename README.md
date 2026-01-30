# Ogito Order Management System

Food Production Order Management System for managing daily line sales orders.

## Setup

### Prerequisites
- Node.js 24+
- MongoDB

### Installation

1. **Server Setup**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

2. **Client Setup**
```bash
cd client
npm install
cp .env.example .env
# Edit .env with your API URL
```

### Running the Application

1. **Start MongoDB** (if running locally)
```bash
mongod
```

2. **Seed Admin User**
```bash
cd server
npm run seed
```
Default admin credentials:
- Username: `admin`
- PIN: `123456`

3. **Start Server**
```bash
cd server
npm run dev
```
Server runs on `http://localhost:5000`

4. **Start Client**
```bash
cd client
npm run dev
```
Client runs on `http://localhost:5173`

## Features

- **PIN-based Authentication** with role-based access (Admin/User)
- **Order Management**: Create and view daily orders with automatic price calculation
- **Customer Management** (Admin): CRUD operations and CSV import
- **User Management** (Admin): Create users and update PINs
- **CSV Export**: Export orders for accounting and operations
- **Role-based Permissions**: Sales users see only their orders, admins see all

## Tech Stack

**Frontend:**
- React + TypeScript
- Tailwind CSS + shadcn/ui
- React Router
- Axios

**Backend:**
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT Authentication
- bcrypt for PIN hashing

## Default Credentials

After running `npm run seed` in the server directory:
- **Username**: admin
- **PIN**: 123456

⚠️ **Important**: Change the default PIN after first login.

# Ogito Order Management System

Food Production Order Management System for managing daily line sales orders.

## Setup
 - make sure everyting clean

### Prerequisites
- Node.js 24+
- MongoD B


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

- **PIN-based Authentication** with role-based access (Admin, User, Driver, CEO)
- **Order Management**: Create, edit, and view daily orders with automatic pricing and taxation.
- **Customer × Product Personal Best**: The system tracks the highest quantity (Standard & Premium) ever successfully ordered by a customer and automatically defaults their future orders to their Personal Best. Includes non-blocking warnings if a salesman attempts to order below the Personal Best.
- **Customer Management** (Admin): CRUD operations, Google Maps location integration, and CSV import.
- **Mobile-Optimized UI**: Compact, horizontally scrollable data tables for managing large volumes of orders natively on mobile devices.
- **Route & Vehicle Tracking**: Assign vehicles (A, B, C, D, E) automatically based on the salesman and day of the week.
- **Advanced Analytics**: Monthly trends, route breakdowns, and automated anomaly detection.
- **Role-based Permissions**: Sales users see only their orders, admins see all.

## Tech Stack

**Frontend:**
- React + TypeScript (Vite)
- Tailwind CSS + shadcn/ui
- React Router
- Axios for API requests

**Backend:**
- Node.js + Express + TypeScript
- MongoDB + Mongoose (Advanced Aggregation Pipelines)
- JWT Authentication
- bcrypt for PIN hashing

## Core Workflows

### Order Creation & Personal Best
1. **Customer Selection**: A salesman selects a customer when creating an order.
2. **Personal Best Calculation**: The backend runs a lightweight aggregation across the customer's entire valid order history (excluding cancelled orders) to find the `$max` standard and premium quantities.
3. **Form Pre-fill**: The inputs default to these Personal Best numbers.
4. **Behavioral Warning**: If the salesman types a number lower than the Personal Best, a dismissible warning appears underneath the input. This does not block the order, but prompts the salesman to verify the lower amount.

### Delivery & Fulfillment
1. Orders start in a `Pending` (unbilled) state.
2. Delivery drivers can mark sequences and update delivery statuses.
3. Once fulfilled, orders are marked as `Billed` for accounting.

## Default Credentials

After running `npm run seed` in the server directory:
- **Username**: `admin`
- **PIN**: `123456`

⚠️ **Important**: Change the default PIN after first login.

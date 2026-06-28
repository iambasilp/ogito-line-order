# 4. API SPECIFICATION

## 4.1 Verification Status
- **Files Inspected**: `server/src/routes/*.ts`, `server/src/controllers/*.ts`
- **Total API Files**: 14 (7 routes, 7 controllers)
- **Coverage**: 100% Verified from source.

## 4.2 Endpoint Dictionary

### Auth API (`server/src/routes/auth.ts`)
| Endpoint | Method | Middleware | Controller | Purpose |
|----------|--------|------------|------------|---------|
| `/api/auth/login` | POST | None | `authController.login` | Authenticates user via `username` and `pin`. Returns JWT and user object. |
| `/api/auth/me` | GET | `verifyToken` | `authController.getMe` | Validates JWT and returns current user session. |
| `/api/auth/update-pin` | PUT | `verifyToken` | `authController.updatePin` | Allows user to update their own PIN. |

### Customers API (`server/src/routes/customers.ts`)
| Endpoint | Method | Middleware | Controller | Purpose |
|----------|--------|------------|------------|---------|
| `/api/customers` | GET | `verifyToken`, `isDriverOrAdmin` | `getCustomers` | Fetches all customers. |
| `/api/customers` | POST | `verifyToken`, `isAdmin` | `createCustomer` | Creates a new customer. |
| `/api/customers/:id`| PUT | `verifyToken`, `isAdmin` | `updateCustomer` | Edits customer profile & pricing. |
| `/api/customers/:id`| DELETE | `verifyToken`, `isAdmin` | `deleteCustomer` | Soft or hard deletes a customer. |
| `/api/customers/export` | GET | `verifyToken`, `isAdmin` | `exportCustomersCSV` | Exports customer list to CSV. |
| `/api/customers/import` | POST | `verifyToken`, `isAdmin`, `upload.single('file')` | `importCSV` | Bulk imports customers. |

### Orders API (`server/src/routes/orders.ts`)
| Endpoint | Method | Middleware | Controller | Purpose |
|----------|--------|------------|------------|---------|
| `/api/orders` | GET | `verifyToken` | `getAllOrders` | Uses complex aggregation to return paginated orders and global totals. Filters by role. |
| `/api/orders` | POST | `verifyToken` | `createOrder` | Creates order. Checks for duplicates for the same customer/date. |
| `/api/orders/:id` | PUT | `verifyToken` | `updateOrder` | Updates order details (Qty, Vehicle). Marks `isUpdated=true`. |
| `/api/orders/:id` | DELETE | `verifyToken`, `isAdmin` | `deleteOrder` | Deletes an order permanently. |
| `/api/orders/export` | GET | `verifyToken` | `exportToCSV` | Uses `csv-stringify` to export orders. |
| `/api/orders/:id/message` | POST | `verifyToken` | `createMessage` | Appends a message to `orderMessages`. |
| `/api/orders/:id/billing` | PATCH | `verifyToken`, `isAdmin` | `updateBillingStatus` | Toggles `billed` boolean. |
| `/api/orders/:id/cancel` | PATCH | `verifyToken`, `isDriverOrAdmin`| `updateCancellationStatus` | Toggles `isCancelled` boolean. |
| `/api/orders/:id/delivery`| PATCH | `verifyToken`, `isDriverOrAdmin`| `updateDeliveryStatus` | Toggles `deliveryStatus` between Pending/Delivered. |

### Routes API (`server/src/routes/routes.ts`)
| Endpoint | Method | Middleware | Controller | Purpose |
|----------|--------|------------|------------|---------|
| `/api/routes` | GET | `verifyToken`, `isAdmin` | `getRoutes` | Lists all routes. |
| `/api/routes` | POST | `verifyToken`, `isAdmin` | `createRoute` | Creates geographic route. |

### Users API (`server/src/routes/users.ts`)
| Endpoint | Method | Middleware | Controller | Purpose |
|----------|--------|------------|------------|---------|
| `/api/users` | GET | `verifyToken`, `isAdmin` | `getUsers` | Lists all employees. |
| `/api/users` | POST | `verifyToken`, `isAdmin` | `createUser` | Registers a new employee with a PIN and Role. |

### Targets API (`server/src/routes/targets.ts`)
| Endpoint | Method | Middleware | Controller | Purpose |
|----------|--------|------------|------------|---------|
| `/api/targets` | GET | `verifyToken`, `isAdmin` | `getTargets` | Fetches monthly KPIs for Sales Executives. |
| `/api/targets` | POST | `verifyToken`, `isAdmin` | `createTarget` | Upserts a target for a given User/Month. |

### Notifications API (`server/src/routes/notificationRoutes.ts`)
| Endpoint | Method | Middleware | Controller | Purpose |
|----------|--------|------------|------------|---------|
| `/api/notifications` | GET | `verifyToken` | `getNotifications` | Fetches active notifications for user. |
| `/api/notifications/subscribe` | POST | `verifyToken` | `subscribeToPush` | Registers a Web Push subscription. |

---

## 4.3 Database Query Analysis (Controllers)
- **Aggregation Heavy**: `getAllOrders` in `ordersController.ts` (Lines 63-158) is a massive pipeline. It performs `$lookup` on `customers` and `routes`, computes `$multiply` for pricing (`standardQty * greenPrice`), applies `$regex` for searching, and uses `$facet` for paginated results + summaries.
- **Risk**: Hardcoded paths like `'$standardQty'` and `'$greenPrice'` in aggregations mean dynamic pricing migration will require a total rewrite of this controller.

## 4.4 Middleware Analysis
- `auth.ts` contains:
  - `verifyToken`: Extracts JWT from `req.cookies.token` or `Authorization` header.
  - `isAdmin`: Requires `req.user.role === 'admin' || 'ceo'`.
  - `isDriverOrAdmin`: Requires `role === 'admin' || 'ceo' || 'driver'`.
  - `isGlobalViewer`: Helper function used in controllers to determine DB filter scope.

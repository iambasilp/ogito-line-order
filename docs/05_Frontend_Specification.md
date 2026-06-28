# 5. FRONTEND & COMPONENT SPECIFICATION

## 5.1 Verification Status
- **Files Inspected**: `client/src/pages/*`, `client/src/components/*`, `client/src/context/*`
- **Total Frontend Files**: ~40 Component/Page Files.
- **Coverage**: 100% Verified from source.

## 5.2 Context Analysis

### 1. `AuthContext.tsx`
- **Purpose**: Global authentication and RBAC session manager.
- **State**: `user` (Object), `token` (String), `loading` (Boolean).
- **Derived State**: `isAdmin`, `isCeo`, `isGlobalViewer`.
- **Lifecycle**: On mount, reads `token` from `js-cookie` and `user` from `localStorage`. 

### 2. `OrdersContext.tsx`
- **Purpose**: Global cache for Orders and Stock information, enabling optimistic UI updates for Drivers.
- **State**: `orders` (Array), `standardStock` (Object: initial, delivered), `premiumStock` (Object: initial, delivered).
- **Actions**: `SET_ORDERS`, `MARK_ORDER_DELIVERED`, `REVERT_ORDER_DELIVERED`, `CANCEL_ORDER`.
- **Risk**: Hardcoded assumptions about `standardStock` and `premiumStock`. Must be rewritten if products become dynamic.

## 5.3 Page Analysis

### 1. `Orders.tsx` (1492 lines)
- **Role**: Primary operational hub.
- **Features**: Advanced filtering (Date, Vehicle, Route, Executive), Search, CSV Export, rendering `<OrderTable />`.
- **State**: Complex local state for filters (`dateRange`, `selectedRoute`, `visibleColumns`). 
- **Dependencies**: Relies heavily on `OrdersContext` and `api.get('/orders')`.
- **Risk**: Extreme coupling to `standardQty` and `premiumQty` throughout its 1492 lines for local summation logic.

### 2. `Customers.tsx` (799 lines)
- **Role**: Admin/CEO Customer Management.
- **Features**: Add/Edit Dialogs, Table (Desktop), Cards (Mobile).
- **Forms**: Requires explicit `greenPrice` and `orangePrice` inputs.
- **Dependencies**: `/api/customers`.

### 3. `Dashboard.tsx` (1040 lines)
- **Role**: Global KPI tracking.
- **Widgets**: Revenue (Total, Target), Volumes (Standard, Premium), Order Success Rate.
- **Charts**: 7-Day Trend Bar Chart using `recharts`.
- **Dependencies**: Reads `/api/orders` summary node and `/api/targets`.

### 4. `Targets.tsx`, `Users.tsx`, `Routes.tsx`
- **Role**: Administrative CRUD views. Standard Data Tables and Edit Dialogs.

## 5.4 Component Analysis

### 1. `OrderFormModal.tsx` (484 lines)
- **Purpose**: The most complex form in the application, handling both Create and Edit states for Orders.
- **Flow**:
  1. User types in search. `fetchCustomers` fires (debounced).
  2. Select Customer -> Populates `route` and `salesExecutive`.
  3. User modifies Qty fields.
  4. `calculateTotals` multiplies Qty * Customer Prices dynamically.
- **UI Inventory**: Shadcn `<Dialog>`, custom debounced Search `<Input>`, `<Select>` for vehicles.
- **Technical Debt**: (Lines 41-42) initializes state with `standardQty: 0, premiumQty: 0`.

### 2. `OrderTable.tsx` (268 lines)
- **Purpose**: Renders rows of orders based on `visibleColumns` configuration.
- **Responsive Behavior**: Hides non-critical columns on mobile viewports.
- **Actions**: Admin users see 'Edit', 'Delete', 'Bill' buttons. Drivers see 'Deliver' buttons.

### 3. `OrderMessageDialog.tsx` & `OrderMessageIcon.tsx`
- **Purpose**: A sub-system for attaching comments/messages to orders. Includes an approval flow for Admins to approve/reject change requests from Sales Execs.

### 4. `Layout.tsx` & `ProtectedRoute.tsx`
- **Purpose**: App shell. `Layout` provides Sidebar/Navbar navigation. `ProtectedRoute` intercepts routing if `!user` or if the route `requiresAdmin` but `!isAdmin`.

## 5.5 UI Inventory
- **Framework**: Shadcn UI (accessible Radix primitives wrapped in Tailwind).
- **Core Primitives**: `<Button>`, `<Input>`, `<Select>`, `<Dialog>`, `<Card>`, `<Tooltip>`, `<Badge>`, `<Popover>`.
- **Mobile Strategy**: Tables transform into Cards on smaller viewports, or horizontal scrolling is enabled.

---

## 5.6 Migration Impact on Frontend
Replacing `standardQty` and `premiumQty` will completely break `OrdersContext`, `Orders.tsx`, `OrderFormModal.tsx`, `OrderTable.tsx`, and `Dashboard.tsx`. 

**Action Required**:
1. `OrdersContext` must store dynamic `stock[productId]: {initial, delivered}`.
2. `OrderFormModal` must map over an array of `products` fetched from the backend.
3. `OrderTable` must generate columns dynamically based on `Object.keys(order.items)`.

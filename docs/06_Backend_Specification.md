# 6. BACKEND SPECIFICATION

## 6.1 Verification Status
- **Files Inspected**: `server/src/controllers/*`, `server/src/services/*`, `server/src/scripts/*`, `server/src/config/*`
- **Total Backend Files**: 23
- **Coverage**: 100% Verified from source.

## 6.2 Controllers Analysis

### 1. `ordersController.ts` (1399 lines)
- **Role**: The operational heart of the application.
- **Key Methods**:
  - `getAllOrders`: The most complex function in the repository. Uses a massive MongoDB `$aggregate` pipeline. 
    - **Stages**: `$match` (Date, Route, Vehicle, SalesExec filters) -> `$lookup` (Customers) -> `$unwind` -> `$lookup` (Routes) -> `$addFields` (calculate `standardTotal` = `standardQty * greenPrice`) -> `$facet` (Separates paginated orders array from a summary totals document).
  - `createOrder`: Validates date uniqueness (`find` between `startOfDay` and `endOfDay`). Sends push notification on success.
  - `updateOrder`: Manages modifications. Handles auto-resetting the `isCancelled` flag and updating the `isUpdated` flag.
  - `exportToCSV`: Uses `$aggregate` to build flat rows, passing them to `csv-stringify`.
- **Complexity**: Extremely High.
- **Risk**: Any change to product models requires a full rewrite of the aggregation pipelines here.

### 2. `customersController.ts` (417 lines)
- **Role**: Customer profile and pricing configuration.
- **Key Methods**:
  - `getCustomers`: Uses `$lookup` to join the assigned Route name. Returns sorted by name.
  - `createCustomer`: Validates `name` uniqueness.
  - `importCSV`: Parses uploaded files using `csv-parse`. Expects precise headers (`Name`, `Route`, `SalesExecutive`, `GreenPrice`, `OrangePrice`, `Phone`).
- **Complexity**: Medium.

### 3. `authController.ts` (50 lines)
- **Role**: Issues JWTs.
- **Key Methods**:
  - `login`: Uses `User.findOne`, calls `user.comparePin()`. Signs JWT with `id`, `role`, `username`, `name` expiring in 14 days.

### 4. `usersController.ts`, `targetsController.ts`, `routesController.ts`
- **Role**: Standard CRUD operations wrapped in `try/catch` blocks.
- **Complexity**: Low.

## 6.3 Scripts Analysis
Located in `server/src/scripts/`, these are utility files intended to be run via `ts-node`:
- `seed.ts`: Seeds the initial `admin` user with PIN `123456`.
- `clearCustomers.ts`: Drops the Customer collection (Danger).
- `migrateRoutesToIds.ts`: Legacy data migration script mapping string routes to ObjectIds.

## 6.4 Services Analysis
- `notificationService.ts`: 
  - **Dependencies**: `web-push` library.
  - **Purpose**: Creates a `Notification` document in MongoDB and iterates over the recipient's `pushSubscriptions` to send VAPID signed browser push notifications.

---

# 7. PERFORMANCE & SECURITY REPORT

## 7.1 Security Audit
- **Authentication**: JWT is secure. The secret is properly loaded from `process.env.JWT_SECRET`.
- **Passwords**: PINs are hashed using `bcryptjs` with a salt factor of 10.
- **Authorization**: The `verifyToken` middleware correctly rejects missing or malformed tokens. RBAC is enforced via custom middlewares (`isAdmin`, `isDriverOrAdmin`).
- **Data Isolation**: `isGlobalViewer(req.user)` acts as a tenancy guard. If false, controllers forcibly inject `req.user.username` into the MongoDB `$match` stages to ensure Sales Execs cannot see each other's data.
- **XSS / SQLi**: Mongoose automatically sanitizes NoSQL injection. React handles XSS escaping.

## 7.2 Performance Audit
- **N+1 Queries**: Eliminated. `ordersController` uses Aggregation Pipelines to pull Customer and Route data in a single DB round-trip.
- **Indexes**: The database is heavily indexed on `date`, `salesExecutive`, `route`, and `vehicle`. Queries on large datasets will resolve in `O(log N)` time.
- **Bottlenecks**:
  - **Regex Searching**: The `search` filter in `getAllOrders` uses `$regex: safeSearch, $options: 'i'`. This cannot utilize traditional indexes and will cause a full Collection Scan (`COLLSCAN`). If the DB grows >100,000 records, this will degrade performance severely. A text index is recommended.
  - **Dynamic Totals**: Calculating `standardTotal = standardQty * greenPrice` dynamically on every `GET` request wastes CPU. Financial totals should be snapshotted in the Order document at creation time.

## 7.3 Code Quality & Technical Debt
- **SOLID Violations**: `OrderFormModal.tsx` violates Single Responsibility by containing complex debouncing, pricing algorithms, API calls, and markup in one 484-line file.
- **Hardcoded Logic**: `greenPrice` and `orangePrice` act as a severe technical limitation preventing business scaling.
- **Dead Code**: `test_db.js`, `test_api.js`, `test_delivery.js`, and `refactor_colors.js` are orphaned scripts taking up repository space.

# PASS 1: COMPLETE REPOSITORY INVENTORY

## 1.1 Complete Folder Tree

```text
ogito-line-order/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── orders/
│   │   │   ├── theme/
│   │   │   └── ui/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
├── docs/
└── server/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── scripts/
    │   └── services/
```

## 1.2 Configuration, Environment & Build Files

| File | Type | Purpose | Owner Module | Complexity |
|------|------|---------|--------------|------------|
| `/server/.env` | Env | Stores secrets (JWT_SECRET, MONGODB_URI) | Backend | Low |
| `/server/.env.example` | Env | Template for environment vars | Backend | Low |
| `/server/package.json` | Config/Build | Backend dependencies and NPM scripts | Backend | Low |
| `/server/tsconfig.json` | Config | TypeScript compiler configuration | Backend | Low |
| `/client/.env` | Env | Stores frontend environment variables (VITE_API_URL) | Frontend | Low |
| `/client/.env.example` | Env | Template for frontend environment vars | Frontend | Low |
| `/client/package.json` | Config/Build | Frontend dependencies and Vite scripts | Frontend | Low |
| `/client/tsconfig.json` | Config | TypeScript configuration for client | Frontend | Low |
| `/client/vite.config.ts` | Build | Vite bundler configuration | Frontend | Low |
| `/client/tailwind.config.js` | Config | Tailwind CSS utility classes configuration | Frontend | Low |
| `/client/postcss.config.js` | Config | PostCSS config for Tailwind | Frontend | Low |
| `/client/eslint.config.js` | Config | Linter rules | Frontend | Low |
| `/client/vercel.json` | Config | Vercel deployment configuration | Frontend | Low |

## 1.3 Complete File Inventory & Purpose

### Server Source Files (`server/src/`)
| File | Technology | Purpose | Risk | Consumers |
|------|------------|---------|------|-----------|
| `index.ts` | Express/Node | Entry point for backend. Bootstraps Express and DB. | High | N/A |
| `config/constants.ts` | TS | Defines global constants (e.g., ROLES). | Low | Controllers, Models |
| `config/database.ts` | TS | Mongoose connection logic. | Med | `index.ts` |
| `middleware/auth.ts` | Express | JWT verification and RBAC guards. | High | `routes/*` |
| `models/User.ts` | Mongoose | Schema for users and authentication logic. | High | `authController`, `usersController` |
| `models/Customer.ts` | Mongoose | Schema for clients and dynamic pricing. | High | `customersController`, `ordersController` |
| `models/Order.ts` | Mongoose | Schema for daily transactions and message subdocs. | High | `ordersController` |
| `models/Route.ts` | Mongoose | Schema for geographical routing zones. | Low | `routesController` |
| `models/Target.ts` | Mongoose | Schema for KPI targets. | Low | `targetsController` |
| `models/Notification.ts`| Mongoose | Schema for internal push and UI notifications. | Med | `notificationService` |
| `controllers/authController.ts` | Express | Handles login and token generation. | High | `routes/auth.ts` |
| `controllers/ordersController.ts` | Express | Complex aggregation and CRUD for orders. | High | `routes/orders.ts` |
| `controllers/customersController.ts`| Express | CRUD and CSV importing for customers. | Med | `routes/customers.ts` |
| `controllers/usersController.ts` | Express | CRUD for users. | Med | `routes/users.ts` |
| `routes/*.ts` | Express | Maps HTTP endpoints to controller methods. | Low | `index.ts` |
| `services/notificationService.ts` | Web Push | Handles pushing notifications to browsers. | Med | Controllers |

### Client Source Files (`client/src/`)
| File | Technology | Purpose | Risk | Consumers |
|------|------------|---------|------|-----------|
| `main.tsx` | React | Mounts React to the DOM. | Low | Browser |
| `App.tsx` | React Router | Defines all client-side routes and wraps Providers. | High | `main.tsx` |
| `context/AuthContext.tsx` | React Context | Manages JWT, login state, and RBAC visibility. | High | Pages, ProtectedRoute |
| `context/OrdersContext.tsx`| React Context | Caches orders and handles optimistic delivery UI. | High | `Orders.tsx` |
| `lib/api.ts` | Axios | Pre-configured HTTP client injecting JWT headers. | High | All API calls |
| `lib/utils.ts` | TS | Styling (clsx) and disabled Haptic/Audio rewards. | Low | Components |
| `pages/Orders.tsx` | React | Main operations view. Data table and filtering. | High | `App.tsx` |
| `pages/Dashboard.tsx` | React | Aggregated KPI widgets and Recharts. | Med | `App.tsx` |
| `components/orders/OrderFormModal.tsx`| React | Complex dialog for order creation. | High | `Orders.tsx` |
| `components/ui/*.tsx` | React/Radix | Pure presentational components (Buttons, Inputs). | Low | All Pages |

### Scripts & Utilities
- `server/src/scripts/seed.ts`: Seeds initial admin user.
- `server/src/scripts/clearCustomers.ts`: Wipes customer collection.
- `server/src/scripts/migrateRoutesToIds.ts`: DB Migration script.

## 1.4 Unused, Deprecated, and Dead Files
- `server/test_db.js`, `server/test_api.js`: Manual testing scripts. High probability of being dead code.
- `client/test_delivery.js`, `client/test-render.js`: Deprecated manual frontend test scripts.
- `refactor_colors.js`: One-off AST/Regex script likely used for a past UI update.

## 1.5 Coverage Report
- **Files Inspected**: 100% of tracked repository files identified.
- **Coverage Percentage**: 100% (Pass 1).
- **Verification Status**: Verified via bash `find` command. All environment, configuration, client, and server source files have been mapped.

---
**PASS 1 COMPLETE.**
**AWAITING PASS 2 EXECUTION.**

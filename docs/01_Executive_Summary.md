# 1. EXECUTIVE SUMMARY

## 1.1 Purpose
The **Ogito Line Order Management System** is a full-stack web application designed for the food production and distribution industry. It manages daily line sales orders, customer pricing configurations, route assignments, and employee performance targets.

## 1.2 Business Domain
- **Industry**: Food Manufacturing & Route Distribution.
- **Core Loop**: Sales Executives take daily orders from assigned customers along specific delivery routes; Drivers fulfill and mark orders as delivered; Administration tracks KPIs, revenue, and product volumes in real-time.

## 1.3 Main Users
1. **Admin / CEO**: Full access. Manage all customers, routes, users, targets, and view global dashboards.
2. **User (Sales Executive)**: Restricted access. Can only view and create orders for customers assigned to them.
3. **Driver**: Fulfills orders. Can mark orders as 'Delivered' or 'Pending'.

## 1.4 Architecture Overview
The system follows a monolithic Client-Server architecture:
- **Frontend**: A Single Page Application (SPA) built with React 18 and Vite. It utilizes Tailwind CSS and Shadcn UI for component styling.
- **Backend**: A RESTful API built with Node.js and Express.js.
- **Database**: MongoDB, interacted with via Mongoose ODM.
- **Authentication**: Stateless JWT authentication combined with a role-based access control (RBAC) middleware.

## 1.5 System Status
- **Current State**: Production-ready for a 2-product constraint.
- **Major Technical Debt**: The concepts of products ("Standard" and "Premium") are hardcoded deeply into the database schemas, API aggregation pipelines, and UI components. 
- **Migration Need**: The system requires a significant architectural refactor to support dynamic products (e.g., adding a third product type currently requires hardcoding new fields across the entire stack).

## 1.6 Deployment Assumptions
- **Frontend Build**: `npm run build` generates static assets via Vite.
- **Backend Build**: `tsc` compiles TypeScript to JavaScript in the `/dist` directory.
- **Hosting**: Designed for standard Node.js environments (e.g., Vercel, Heroku, AWS EC2) with a managed MongoDB cluster (e.g., MongoDB Atlas).

# 💄 BeautyHub

> **Status:** 🎉 Completed (Jan 2026)

BeautyHub is a production-ready, full-stack e-commerce platform built with the MERN stack (MongoDB, Express.js, React 19, Node.js), Redis caching, Redux Toolkit, and enterprise-grade OWASP security controls. It provides a seamless shopping experience for beauty products with a responsive client portal, administrative inventory management, atomic checkout, and high-performance in-memory caching.

---

## 🚀 Tech Stack

### **Frontend**
* **Framework & Build Tool:** React 19, Vite
* **State Management:** Redux Toolkit (`authSlice`, `cartSlice`, `productsSlice`)
* **Styling:** Tailwind CSS v4, Custom Vanilla CSS
* **Routing:** React Router DOM v7
* **HTTP Client:** Axios (Custom Request/Response Interceptors with Token Refresh Queue)
* **Authentication:** Google OAuth (`@react-oauth/google`), JSON Web Tokens (JWT)
* **UI Components & Icons:** React Icons, React Hot Toast

### **Backend**
* **Runtime & Framework:** Node.js, Express.js 5
* **Architecture:** Modular Monolith (Routers, Controllers, Services, Middleware)
* **Database & ORM:** MongoDB, Mongoose 9
* **In-Memory Cache & Session:** Redis (`ioredis`) for query caching & instant token revocation
* **Input Validation:** Zod schema validation
* **Logging & Observability:** Winston structured logging
* **Email Service:** Nodemailer

### **Security Hardening (OWASP Top 10 Aligned)**
* **HTTP Headers:** Helmet.js protection
* **NoSQL Injection Guard:** Custom input sanitization (`$` and `.` operator stripping)
* **SSRF Guard:** Custom IP validation middleware to block internal/private range calls
* **Rate Limiting:** `authLimiter` (5 attempts / 15 mins per IP)
* **Automated Account Lockout:** 15-minute lockout after 5 consecutive failed login attempts
* **Dual-Token JWT Auth:** Short-lived 15-min Access Token (Memory) + 7-day `httpOnly` Refresh Cookie
* **Token Revocation:** Instant server-side logout via Redis token blacklisting (`bl_<token>`)

---

## ✨ Features

### 🛍️ **Customer Experience**
- [x] **Responsive SPA UI**: Optimized for mobile, tablet, and desktop viewing.
- [x] **Product Catalog**: Dynamic catalog browsing with categories, filtering, and search.
- [x] **Shopping Cart**: Real-time cart state management with persistent storage via Redux Toolkit.
- [x] **Multi-Step Checkout**: Secure order placement with atomic stock validation.
- [x] **Order History**: Personal order tracking and detailed itemized receipts (`MyOrders`).
- [x] **Google & JWT Auth**: Flexible authentication with password visibility toggling and password reset support.

### 🛡️ **Admin & Management Portal**
- [x] **Product CRUD**: Add, edit, view, and delete catalog items (`AddProduct`, `EditProduct`, `ViewProducts`).
- [x] **Inventory Management**: Real-time stock tracking with automated out-of-stock guards.
- [x] **Role-Based Access Control**: Strict RBAC middleware (`requireAdmin`) guarding administrative APIs.

### ⚡ **Performance & Security Highlights**
- [x] **Redis Caching**: 10x–30x speed enhancement on catalog queries with automated cache invalidation on product edits.
- [x] **Atomic Inventory Decrementing**: Mongoose `$inc` conditional queries prevent race conditions during concurrent checkouts.
- [x] **Silent Token Refresh**: Axios interceptors handle `401 Unauthorized` token refreshes without user disruption.

---

## 📁 Repository Structure

```
BeautyHub/
├── Backend/                    # Node.js & Express API Server
│   ├── config/                 # Redis & Winston Logger configurations
│   ├── controllers/            # User, Product, and Order controllers
│   ├── middleware/             # Auth, Rate Limiter, Cache, Sanitization, SSRF Guard
│   ├── models/                 # Mongoose Data Schemas (User, Product, Order)
│   ├── Routers/                # API Route definitions (/api/users, /api/products, /api/orders)
│   ├── utils/                  # Auth logging & SSRF helper utilities
│   ├── index.js                # Server entry point
│   └── SECURITY_THREAT_MODEL.md # OWASP threat analysis documentation
│
└── Frontend/                   # React 19 & Vite SPA
    ├── src/
    │   ├── api/                # Axios instance & interceptors
    │   ├── app/                # Redux Store & Slices (auth, cart, products)
    │   ├── components/         # Reusable UI components
    │   ├── pages/              # Client & Admin page views
    │   └── main.jsx            # React root component
```

---

## 💻 Running the Project Locally

### Prerequisites
- **Node.js**: v18+ installed
- **MongoDB**: Local instance or MongoDB Atlas URI
- **Redis**: Local Redis server (`localhost:6379`) or Redis Cloud connection

### 1. Clone the Repository
```bash
git clone https://github.com/vindyacharuni/BeautyHub.git
cd BeautyHub
```

### 2. Backend Setup
```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory:
```env
PORT=5000
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
NODE_ENV=development
```

Start the backend server:
```bash
npm start
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd Frontend/frontend
npm install
```

Create a `.env` file in the `Frontend/frontend` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the Vite development server:
```bash
npm run dev
```

---

## 👨‍💻 Author

**Vindya Charuni**  
* GitHub: [@vindyacharuni](https://github.com/vindyacharuni)




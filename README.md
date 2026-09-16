# ShegAddis - Premium E-Commerce Platform

ShegAddis is a modern, premium full-stack e-commerce web application specifically tailored for the Ethiopian retail market. It bridges the gap between informal social commerce (like Telegram channels) and a dedicated, professional online storefront. 

The platform offers a seamless, luxury shopping experience for customers with localized delivery scheduling, while empowering store owners with automated inventory management and a custom Telegram-integration pipeline.

## Key Features

- **Custom Telegram Parsing Engine**: Instantly converts raw Telegram promotional posts into structured database inventory. It automatically extracts titles, prices (in ETB), categories, and intelligent discrete sizes (shoes vs. clothing), drastically reducing manual data entry.
- **Localized Checkout & Logistics**: Replaces standard payment gateways with a "Pay on Delivery / Bank Transfer" flow optimized for the local market. Includes a dynamic delivery scheduler that calculates cutoff times and filters available delivery days.
- **Variant-Level Inventory Management**: A robust database schema tracks stock across specific product sizes and colors, automatically preventing overselling and broken orders.
- **Premium UI/UX Design**: Built with Tailwind CSS and Framer Motion, the frontend delivers a high-end, editorial-style aesthetic featuring fluid layout animations, responsive interactive hover states, and a clean typography scale.
- **Full Admin Dashboard**: Comprehensive back-office tools for managing products, variants, categories, orders, user accounts, and site settings (including delivery fees and promotional banners).

## Tech Stack

**Frontend**
- **React (v18)** & **React Router** for SPA navigation
- **TypeScript** for end-to-end type safety
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for fluid animations and micro-interactions
- **Zustand** for lightweight global state management (Cart, Auth, Settings)
- **Radix UI / Shadcn** for accessible UI primitives

**Backend & Database**
- **Node.js** & **Express** (API routes and backend logic)
- **Neon Serverless PostgreSQL** (Scalable edge database)
- **Drizzle ORM** (Type-safe database interactions and schema management)
- **JSON Web Tokens (JWT)** for secure, role-based authentication

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A PostgreSQL database URL (Neon recommended)
- A Cloudinary account (for image hosting)

### Installation

1. **Clone the repository**
   ```bash
   git clone <this-repository-url>
   cd <repository-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://user:password@host/dbname"

   # Authentication
   JWT_SECRET="your_jwt_secret"

   # Cloudinary (Image Hosting)
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   ```

4. **Initialize the Database**
   Push the Drizzle schema to your PostgreSQL database:
   ```bash
   npm run db:push
   ```
   *(Optional)* Seed the database with initial settings and admin user:
   ```bash
   npm run db:seed
   ```

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Build & Deployment

The application utilizes a custom build pipeline that bundles both the Vite React frontend and the Express backend into a single production-ready artifact.

```bash
npm run build
npm start
```
- `npm run build`: Compiles the React frontend into static assets (`/dist`) and bundles the Express backend (`server.ts`) via `esbuild` into a CJS file (`dist/server.cjs`).
- `npm start`: Runs the compiled backend server, serving both the API routes and the static frontend assets.

## 📝 License

This project is proprietary and confidential.

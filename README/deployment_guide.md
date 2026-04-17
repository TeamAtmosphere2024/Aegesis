# 🚀 Aegesis Production Deployment Guide

This guide provides step-by-step instructions to deploy the Aegesis platform to **Render**, **Vercel**, and **Neon**.

---

## 🐘 1. Database Setup (Neon)
1.  **Sign up** at [neon.tech](https://neon.tech).
2.  **Create a Project** named `aegesis`.
3.  **Copy the Connection String**: It will look like `postgres://user:password@hostname/neondb?sslmode=require`.
4.  **Keep this safe** for the Render step.

---

## 🏗️ 2. Backend Deployment (Render)
You will deploy two services on Render using your Docker image.

### Step A: API Web Service
1.  **Create a New Web Service** on Render.
2.  **Connect your GitHub Repository**.
3.  **Configure**:
    *   **Name**: `aegesis-api`
    *   **Runtime**: `Docker`
    *   **Dockerbox Context**: `backend` (if your repo structure requires it)
    *   **Dockerfile Path**: `./backend/Dockerfile`
4.  **Environment Variables**:
    *   `DATABASE_URL`: Your Neon connection string.
    *   `EXPO_PUBLIC_API_URL`: (Optional - used if you want to hardcode it).
    *   `RAZORPAY_KEY_ID`: Your Razorpay Key.
    *   `RAZORPAY_KEY_SECRET`: Your Razorpay Secret.
    *   `REDIS_URL`: `redis://red-d7h78ghf9bms739n9e5g:6379`
    *   `CORS_ORIGINS`: `https://your-frontend.vercel.app` (Add your Vercel URL here later).

### Step B: Background Worker
1.  **Create a New Background Worker** on Render.
2.  **Connect the same Repository**.
3.  **Configure**:
    *   **Name**: `aegesis-worker`
    *   **Runtime**: `Docker`
    *   **Dockerfile Path**: `./backend/Dockerfile.worker`
4.  **Environment Variables**: Same as the API Web Service.

---

## ⚛️ 3. Frontend Deployment (Vercel)
1.  **Sign up** at [vercel.com](https://vercel.com).
2.  **Import your GitHub Repository**.
3.  **Configure Project**:
    *   **Root Directory**: `frontend`
    *   **Framework Preset**: `Create React App` (or let Vercel auto-detect).
4.  **Environment Variables**:
    *   `EXPO_PUBLIC_API_URL`: `https://your-render-api-url.onrender.com/api/v1`
5.  **Deploy**!

---

## ⚡ 4. Redis Setup (Optional)
If you want to use the high-performance Redis Stream flow:
1.  **Create a Redis Instance** on Render (New > Redis).
2.  **Copy the Redis Internal URL**.
3.  **Add `REDIS_URL`** to both your Backend Web Service and Background Worker on Render.

---

## ✅ 5. Post-Deployment Verification
1.  Visit `https://your-api.onrender.com/health` to confirm the backend is live.
2.  Open your Vercel URL and attempt to login with the test phone number `9876543210`.
3.  Trigger a simulation from the Admin Panel and check if the Payout modal appears.

---
**Guidewire DEVTrails** | *Aegesis: Production-Ready, Scalable, Secure.*

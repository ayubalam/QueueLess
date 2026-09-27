# QueueLess – Smart Queue Management System

A production-style full-stack queue management solution built with modern web technologies.

## Monorepo Architecture

```
QueueLess/
│
├── client/          # React, Vite, TypeScript, Tailwind CSS, shadcn/ui
├── server/          # Node.js, Express, TypeScript, Mongoose (MongoDB)
├── docs/            # Project documentation & design resources
│
├── .env.example     # Environment variable reference
├── .gitignore       # Git ignore settings
├── package.json     # Root npm workspace configuration
└── README.md        # Project documentation
```

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB & Mongoose
- **Tooling**: `tsx` development runner, TypeScript compiler

## Getting Started

### 1. Installation

Install dependencies for both client and server:

```bash
npm run install:all
```

### 2. Environment Setup

Copy `.env.example` files to create `.env` in `client` and `server`:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Development Mode

Run client and server separately or concurrently:

```bash
# Start Client (Vite Dev Server)
npm run dev:client

# Start Server (Express Server with TSX)
npm run dev:server
```

### 4. Production Build Verification

Build client and server:

```bash
# Build Client
npm run build:client

# Build Server
npm run build:server

# Build Both
npm run build:all
```

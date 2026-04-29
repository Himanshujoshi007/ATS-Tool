This is a [Next.js](https://nextjs.org) resume checker application.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Self-Hosting

This app can be hosted on any Node.js server (VPS, Docker, etc.).

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Create a `.env.local` file:

```env
MONGO_URI=mongodb://localhost:27017/resume-checker
```

### Deploy Options

- **Node.js**: Run `npm start` with PM2 or similar process manager
- **Docker**: Build image and deploy to any container registry
- **Railway/Render**: Connect GitHub repo and set environment variables

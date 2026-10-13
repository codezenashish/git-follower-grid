# 🐙 GitHub Followers Grid

> **Dynamic, customizable SVG badge generator that showcases your GitHub followers on your GitHub profile README.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-10%2F10%20passing-brightgreen?style=flat-square)](test/)

---

## ✨ Features

- ⚡ **Dynamic SVG Generation**: Generates real-time, lightweight SVGs directly from the GitHub API.
- 🎨 **Live Interactive Playground**: Customize username, columns, avatar shape, grid width, gap, and limit with real-time preview.
- 🖼️ **Base64 Avatar Inlining**: Followers' avatars are downloaded and inlined into the SVG to bypass external image blocking and CORS restrictions on GitHub's camo proxy.
- 🔗 **Clickable Profiles**: Every avatar in the SVG links directly to the follower's GitHub profile (`https://github.com/:username`).
- 🔘 **Shape Flexibility**: Choose between `circle`, `rounded`, or `square` avatars to match your profile theme.
- 🌗 **Zero-Lag Dark & Light Mode**: Instant client-side theme toggling with smooth MorphIcon state transitions and `localStorage` persistence.
- 🚀 **High-Performance Caching**: In-memory caching with TTL and in-flight request deduplication prevents redundant network calls and shields against GitHub rate limits.
- 📋 **One-Click Markdown Export**: Instantly copy ready-to-paste Markdown snippets or download the raw SVG.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (Turbopack, App Router)
- **UI & Components**: [React 19](https://react.dev/), [MorphIcons](https://morphicons.com/), [Lucide](https://lucide.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with OKLCH design tokens
- **Type Safety**: [TypeScript 5](https://www.typescriptlang.org/)
- **Testing**: Node.js test runner with [tsx](https://github.com/privatenumber/tsx)

---

## 🚀 Quick Start & Local Setup

### Prerequisites

- **Node.js**: `v20+` (Recommended `v22` or `v26`)
- **Package Manager**: [pnpm](https://pnpm.io/) (`v9+` or `v11+`)

### 1. Clone the repository

```bash
git clone https://github.com/codezenashish/git-follower-grid.git
cd git-follower-grid
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your settings:

```env
# Optional: GitHub Personal Access Token to increase API rate limits (from 60/hr to 5,000/hr)
GITHUB_TOKEN=your_personal_access_token_here

# Optional: Public URL for self-hosted instances (defaults to window.location.origin)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server port
PORT=3000
```

> **Note**: While a `GITHUB_TOKEN` is optional for low-traffic local testing, providing a token is highly recommended for production to avoid unauthenticated GitHub API rate limits.

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Linting

```bash
# Run unit and integration tests
pnpm test

# Run ESLint validation
pnpm lint

# Build production bundle
pnpm build
```

---

## 📖 Embedding in your GitHub Profile README

Add the SVG grid to your GitHub profile `README.md` using either Markdown or HTML.

### Option 1: Markdown Link (Recommended)

```markdown
[![Followers](https://git-follower-grid.vercel.app/api/followers.svg?username=YOUR_USERNAME&cols=8&width=640&limit=40&gap=8&shape=rounded)](https://github.com/YOUR_USERNAME?tab=followers)
```

### Option 2: Centered HTML with Custom Header

```html
<div align="center">
  <h3>❤️ Thank you to all my followers</h3>
  <a href="https://github.com/YOUR_USERNAME?tab=followers">
    <img
      width="640"
      alt="GitHub Followers Grid"
      src="https://git-follower-grid.vercel.app/api/followers.svg?username=YOUR_USERNAME&cols=8&width=640&limit=40&gap=8&shape=circle"
    />
  </a>
</div>
```

---

## ⚙️ API Query Parameters

Both `/api/followers.svg` and `/api/followers` endpoints accept the following query parameters:

| Parameter  | Type     | Default   | Range / Allowed Values       | Description                                              |
|------------|----------|-----------|------------------------------|----------------------------------------------------------|
| `username` | `string` | *Required*| Valid GitHub username         | The GitHub user whose followers should be fetched.       |
| `cols`     | `number` | `8`       | `1` – `20`                   | Number of avatar columns per row.                        |
| `width`    | `number` | `640`     | `160` – `1600` (px)          | Total width of the generated SVG canvas in pixels.       |
| `limit`    | `number` | `40`      | `1` – `200`                  | Maximum number of followers to fetch and display.        |
| `gap`      | `number` | `8`       | `0` – `32` (px)              | Spacing between avatars in pixels.                       |
| `shape`    | `string` | `rounded` | `circle` \| `rounded` \| `square` | Shape styling applied to follower avatars.               |

### Example Requests

- **Circle avatars with 10 columns**:
  ```text
  GET /api/followers.svg?username=octocat&cols=10&shape=circle&limit=50
  ```

- **Compact square grid with no gap**:
  ```text
  GET /api/followers.svg?username=octocat&cols=12&gap=0&shape=square&limit=72
  ```

---

## 🛡️ Performance & Reliability

- **HTTP Cache Headers**: Responses return `Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`, allowing CDN edge networks to serve cached SVGs instantly.
- **In-Flight Request Deduplication**: Simultaneous requests for the same username share a single upstream GitHub API call.
- **Safe Fallback**: If an avatar fails to load, a lightweight placeholder silhouette is rendered to keep the grid layout unbroken.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

## 👤 Author

Crafted with care by **[Ashish Choudhary](https://ashishchoudhary.dev)**.

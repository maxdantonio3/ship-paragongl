# ship.paragongl.com — Paragon Customer Portal

Starts as a shipment tracking page. Built with Next.js 14 (App Router), Tailwind CSS, deployed on Vercel.

---

## 🚀 Deploy in 5 Steps

### 1 — Add files to a new GitHub repo

Create a new repo called `ship-paragongl` on GitHub and push all these files.

```bash
git init
git add .
git commit -m "initial commit — tracking page"
git remote add origin https://github.com/YOUR_ORG/ship-paragongl.git
git push -u origin main
```

### 2 — Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `ship-paragongl` GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy**

### 3 — Add Environment Variables in Vercel

Go to your project → **Settings → Environment Variables** and add:

| Key | Value |
|-----|-------|
| `TT_PARTNER_ID` | `152` |
| `TT_ACCOUNT_ID` | `7jlmaLrkj5eq4NN/PHa9uQ==` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | *(your Google Maps key — see below)* |

### 4 — Add Custom Domain

In Vercel → your project → **Settings → Domains**:
- Add `ship.paragongl.com`

Then in **GoDaddy DNS**:
- Add a `CNAME` record:
  - **Name:** `ship`
  - **Value:** `cname.vercel-dns.com`

Wait ~5 minutes for DNS to propagate.

### 5 — Add Logo & Globe files

Put these two files in the `/public` folder:
- `public/logo-full.png` — the full **PARAGON GLOBAL LOGISTICS** horizontal logo PNG (white bg removed — use the transparent version)
- `public/globe.png` — the standalone globe icon PNG, used as the faded background watermark

Both files are included in this repo's `/public` folder — just make sure they're there before deploying.

---

## 🗺️ Google Maps API Key (free)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Maps Embed API**
3. Create an API key → Restrict to `ship.paragongl.com`
4. The Maps Embed API is **free** (no billing needed for embed usage)

---

## 📁 Structure

```
app/
  layout.tsx          — Root layout (nav + metadata)
  page.tsx            — Redirects / → /tracking
  globals.css         — Tailwind + global styles
  api/
    track/
      route.ts        — Serverless proxy → TruckerTools API
  tracking/
    page.tsx          — Main tracking page (search + results + map)
public/
  logo.png            — Paragon globe icon
  globe.png           — Background watermark
```

---

## 🔮 Future Pages (ship.paragongl.com)

- `/tracking` ✅ Done — public load tracking
- `/login` — Customer portal login (Supabase auth)
- `/shipments` — Customer's shipment history
- `/quotes` — Request & view quotes
- `/documents` — BOLs, invoices, PODs
- `/support` — Direct messaging with rep

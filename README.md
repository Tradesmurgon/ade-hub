# ADE Hub — Deployment Guide

## What you need before starting
- GitHub account (github.com) — free
- Vercel account (vercel.com) — free, sign up with GitHub
- Your Supabase project (already created)
- Your Namecheap domain

---

## Step 1 — Run the database schema in Supabase

1. Go to your Supabase project → **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the `schema.sql` file from this package, copy the entire contents, paste into the editor
4. Click **Run**
5. You should see "Success. No rows returned."

---

## Step 2 — Get your service_role key

You need this for the staff management API route. **Never share this key publicly.**

1. Supabase → Project Settings → API
2. Under **Project API keys** find the `service_role` key
3. Copy it — you'll need it in Step 5

---

## Step 3 — Push code to GitHub

1. Create a new **private** repository on GitHub called `ade-hub`
2. On your computer, open Terminal (Mac) or Command Prompt (Windows) in this folder
3. Run these commands:

```bash
git init
git add .
git commit -m "Initial ADE Hub deployment"
git remote add origin https://github.com/YOUR-USERNAME/ade-hub.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy to Vercel

1. Go to vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Find and import your `ade-hub` repository
4. Vercel will auto-detect it as a Vite project — click **Deploy**
5. It will fail on the first build because environment variables aren't set yet — that's OK

---

## Step 5 — Add environment variables to Vercel

1. In Vercel, go to your project → **Settings → Environment Variables**
2. Add these three variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://rrrcqkcernubwovjekkj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_hzayI1mw3Y05F0tdnMOWNw_27ChCDrT` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(your service_role key from Step 2)* |

3. After adding all three, go to **Deployments** and click **Redeploy** on the latest deployment

---

## Step 6 — Add your Namecheap domain

### In Vercel:
1. Project → **Settings → Domains**
2. Add your subdomain e.g. `hub.yourdomain.com.au`
3. Vercel will show you a CNAME value to copy

### In Namecheap:
1. Log in → Domain List → click **Manage** on your domain
2. Go to **Advanced DNS** tab
3. Click **Add New Record**
4. Select **CNAME Record**
5. Host: `hub` (or whatever subdomain you chose)
6. Value: paste the CNAME value from Vercel
7. TTL: Automatic
8. Click the green tick to save

DNS propagation takes 5–30 minutes. After that, `https://hub.yourdomain.com.au` is live with automatic SSL.

---

## Step 7 — First login (owner account setup)

1. Open your domain in the browser
2. The app will show "Create the owner account"
3. Enter your name, email address, and a password
4. You're in — full owner access

---

## Step 8 — Add staff logins

1. Go to **Staff Access** in the sidebar
2. Click **New login**
3. Enter the staff member's name, their email address, a temporary password, and their module permissions
4. They open the domain on their phone, select their name from the dropdown, and enter their password

---

## Updating the app later

Any time you make changes to the code:

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel automatically redeploys within about 60 seconds.

---

## Security notes

- The `SUPABASE_SERVICE_ROLE_KEY` only ever exists on Vercel's servers — it's never sent to a browser
- All database access is protected by Row Level Security — staff cannot query data outside their role even if they tried
- The site is marked `noindex` so search engines won't list it
- HTTPS is automatic via Vercel's SSL certificate

---

## If something goes wrong

- **Build fails**: Check Vercel → Deployments → click the failed deployment → View build logs
- **Login doesn't work**: Check Supabase → Authentication → Users to confirm the account was created
- **Domain not resolving**: DNS can take up to 24h; check Namecheap Advanced DNS to confirm the CNAME is saved correctly
- **API errors**: Check Vercel → Functions → View logs for `/api/staff`

 

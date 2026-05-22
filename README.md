# Kasi24
Kasi24 is a rental marketplace for Kwamhlanga, Mpumalanga, connecting tenants to landlords without agents or middlemen.

# Kasi24 – Find Your Room in Kwamhlanga

**Kasi24 is a rental marketplace built specifically for Kwamhlanga, Mpumalanga. Tenants pay R10 to unlock landlord contact details. Landlords list for free.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-0894A1?style=for-the-badge&logo=netlify&logoColor=white)](https://your-netlify-url.netlify.app)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![PayFast](https://img.shields.io/badge/PayFast-Payments-FF6B35?style=for-the-badge)](https://payfast.io)

---

## 📌 The Problem

Finding a room, back room, flat, or house to rent in Kwamhlanga is broken:

- **Notice boards at Spar and Shoprite** – You have to physically go to the shops every time to check for new listings
- **WhatsApp groups** – Sporadic, chaotic, no search, no way to see everything in one place
- **Facebook Marketplace** – Full of scams and stale posts
- **No agent fees?** – Actually, agents take cuts or tenants waste time calling unavailable properties

**Kasi24 fixes all of this.**

---

## 🚀 The Solution

| For Tenants | For Landlords |
|-------------|----------------|
| Browse listings for free | List your property for free |
| Filter by area, type, and price | 6-step wizard with photo uploads |
| Pay R10 to unlock landlord's number | Dashboard to manage listings |
| Leave feedback after unlocking | View how many tenants unlocked your number |
| Save favourites to wishlist | Boost your listing for R20/week |

**No subscriptions. No monthly fees. You only pay to connect.**

---

## 🏗️ Built With

| Technology | Purpose |
|------------|---------|
| HTML5, CSS3, Vanilla JavaScript | Frontend |
| Supabase (PostgreSQL) | Database, Auth, Storage |
| PayFast | Payment processing |
| ClickSend | SMS verification (in progress) |
| Font Awesome 6.5.0 | Icons |
| Google Fonts (Sora, Nunito) | Typography |

---

## 📁 Project Structure



---

## ✨ Features (Detailed)

### For Tenants (No Account Required)

- ✅ Browse listings with skeletons while loading
- ✅ Filter by area (Slovo Park, Extension 1-3, CPA, Phola Park, Mandela Village, Hospital View)
- ✅ Filter by property type (Room, Back Room, Flat, House)
- ✅ Price range slider (R500 – R8,000)
- ✅ Save favourites to localStorage
- ✅ View full listing details (photos, rent, deposit, included utilities, amenities, preferences)
- ✅ Pay R10 via PayFast to unlock landlord's phone number
- ✅ WhatsApp share button for listings
- ✅ Report fake/stale listings

### For Landlords (Account Required)

- ✅ Register with email + phone number
- ✅ Email verification via Supabase Auth
- ✅ 6-step listing wizard:
  1. Basics (property type, area, available date)
  2. Pricing (rent, deposit, included utilities)
  3. Details (bedrooms, bathroom, furnished, tenant preferences)
  4. Extras (amenities, notes)
  5. Contact (name, email, phone, WhatsApp, SA ID number)
  6. Photos (up to 10 images, drag & drop, reorder)
- ✅ Dashboard to manage listings:
  - Edit listing details
  - Mark as taken / available
  - Delete listing
  - View unlock counts
- ✅ Listings require admin approval before going live

### For Admin

- ✅ Secure login (restricted to admin@kasi24.co.za)
- ✅ Approve or reject pending listings
- ✅ Manage live listings (mark taken, delete, reactivate)
- ✅ View all registered landlords
- ✅ View unlock history with tenant phone numbers

### Payment Flow

1. Tenant clicks "Unlock for R10"
2. Enters SA phone number
3. Creates pending unlock record in Supabase
4. Redirects to PayFast (sandbox or live)
5. Completes payment
6. Redirects back to listing page
7. Polls for payment confirmation
8. Displays landlord's phone number and WhatsApp link

---

## 🗄️ Database Schema

### `landlords`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (matches Supabase Auth) |
| name | TEXT | Landlord's full name |
| phone | TEXT | Verified (SMS planned) |
| whatsapp | TEXT | Optional, defaults to phone |
| email | TEXT | From auth |
| id_number | TEXT | Private, never shown |
| created_at | TIMESTAMP | Auto-set |

### `listings`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| landlord_id | UUID | Foreign key to landlords |
| type | TEXT | room / backroom / flat / house |
| title | TEXT | Auto-generated |
| area | TEXT | Suburb/area name |
| rent | INTEGER | Monthly rent in Rands |
| deposit | INTEGER | Optional deposit |
| available_from | DATE | Availability date |
| bedrooms | TEXT | 1,2,3,4+, bachelor |
| bathroom | TEXT | private / shared / ensuite / outside |
| furnished | TEXT | unfurnished / furnished / semi |
| included | TEXT[] | water, electricity, wifi, refuse, security, dstv |
| amenities | TEXT[] | parking, wifi, laundry, yard, etc. |
| preferences | TEXT[] | no_smokers, no_pets, working, students, etc. |
| notes | TEXT | Additional description |
| is_active | BOOLEAN | Soft delete / taken status |
| is_approved | BOOLEAN | Admin approval required |
| created_at | TIMESTAMP | Auto-set |

### `listing_photos`
| Column | Type |
|--------|------|
| id | UUID |
| listing_id | UUID |
| storage_path | TEXT |
| is_primary | BOOLEAN |
| sort_order | INTEGER |

### `unlocks`
| Column | Type |
|--------|------|
| id | UUID |
| listing_id | UUID |
| landlord_id | UUID |
| tenant_phone | TEXT |
| amount_paid | INTEGER (10) |
| payment_status | TEXT (pending / complete) |
| unlocked_at | TIMESTAMP |

### `reports`
| Column | Type |
|--------|------|
| id | UUID |
| listing_id | UUID |
| reason | TEXT |
| created_at | TIMESTAMP |

---

## 🛡️ Identified Risks & Mitigations

| Risk | Mitigation |
|------|-------------|
| Landlord fraud / fake listings | SMS verification (planned), ID collection, tenant comments (planned), listing expiry (30 days planned) |
| Tenant shares unlocked number | Accept some sharing; encourage sharing listing link instead; temporary numbers (future) |
| Stale / already-taken listings | Admin approval, tenant reports, expiry system (planned) |
| No landlord incentive | Free listings expire; boosts cost R20; good reviews earn "Verified" badge (planned) |
| Payment webhook failures | Return URL polling (implemented); idempotency; retry queue (planned) |
| Manual admin approval bottleneck | Automated flagging (planned); community manager (future) |
| Free competitors (Facebook, Gumtree) | R10 = quality filter, not cost; local focus; tenant feedback loop |
| Legal compliance (POPIA, CPA) | Privacy policy; consent checkboxes; minimal data collection |

---

## 🚦 Roadmap

### Phase 1 – Completed (MVP)
- ✅ Listing creation wizard (6 steps)
- ✅ Photo upload (up to 10 images)
- ✅ Browse + filter listings
- ✅ PayFast payment integration
- ✅ Landlord dashboard
- ✅ Admin panel
- ✅ Wishlist (localStorage)
- ✅ WhatsApp sharing
- ✅ Report listing

### Phase 2 – In Progress
- 🔄 SMS verification for landlords (ClickSend)
- 🔄 Tenant comments/reviews on listings
- 🔄 Listing expiry (30 days) + renewal
- 🔄 Boost feature (R20/week)

### Phase 3 – Post-Competition
- ⏳ Real estate agency subscriptions (R199–R499/month)
- ⏳ Temporary/forwarding phone numbers
- ⏳ Automated image compression
- ⏳ Full-text search
- ⏳ Mobile apps (Capacitor or Flutter)

---

## 💰 Business Model

| User Type | Pays | Receives |
|-----------|------|----------|
| Tenant | R10 (one-time per listing) | Landlord's phone number + ability to leave feedback |
| Individual landlord | R0 (free) | Standard placement in search results |
| Individual landlord (boost) | R20/week | Featured placement + "Boosted" badge |
| Real estate agency (Phase 2) | R199–R499/month | Unlimited listings, analytics, priority support |

---

## 🔧 Local Development

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari)
- Supabase account (free tier)
- PayFast sandbox account (for testing payments)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/kasi24.git
   cd kasi24

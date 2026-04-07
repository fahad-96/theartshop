# 🚀 The Art Shop - Amazon-Level Features Setup Guide

## Overview
This guide walks you through setting up the new Amazon-level features including:
- **Image Upload & Link Support**: Upload images directly or provide URLs
- **Inventory Management**: Track stock per product size
- **Customer Reviews System**: Real customer ratings and reviews
- **Wishlist Feature**: Let customers save favorite products
- **Coupon System**: Promotional codes and discounts
- **Persistent Shopping Cart**: Save cart items

---

## Phase 1: Supabase Schema Deployment

### Step 1a: Run the Enhanced Schema
1. Go to **[Supabase Dashboard](https://app.supabase.com)**
2. Select your "theartshop" project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the ENTIRE contents of `supabase/schema.sql`
6. Paste it into the SQL editor
7. Click **Run** (⌘ Enter or Ctrl+Enter)
8. Wait for success message ✅

**What this creates:**
- `inventory_variants` table (stock tracking per size)
- `customer_reviews` table (customer ratings & reviews)
- `wishlists` table (save products)
- `coupons` table (discount codes)
- `shopping_carts` table (persistent cart)
- `is_admin_user()` RLS function (admin checks)
- `update_product_rating()` trigger (auto-calculate ratings)
- All necessary RLS policies for security

### Step 1b: Verify Tables Were Created
1. In Supabase dashboard, click **Table Editor**
2. Click **Refresh** (F5)
3. You should see these new tables:
   - ✅ `inventory_variants`
   - ✅ `customer_reviews`
   - ✅ `wishlists`
   - ✅ `coupons`
   - ✅ `shopping_carts`
4. The `products` table should have new columns: `image_url`, `average_rating`, `total_reviews`

---

## Phase 2: Supabase Storage Setup (For Image Uploads)

### Step 2a: Create Storage Bucket
1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **Create New Bucket**
3. Name it: `product-images`
4. ✅ Check "Public bucket" (so images are publicly accessible)
5. Click **Create Bucket**

### Step 2b: Enable Image Upload in App
1. The app is already configured in `src/lib/adminApi.js`
2. Function `uploadProductImage()` handles uploads automatically
3. **No additional code changes needed!**

### Step 2c: Test Image Upload
1. Go to `/admin/login` on your deployed site
2. Log in with your admin account
3. In the product form, try **"Or Upload Image"** option
4. Select a JPG/PNG file from your computer
5. Save the product
6. Check that image appears on the product card

---

## Phase 3: Initialize Admin User

### Important: You must do this BEFORE anyone can log into admin!

1. Sign up for your app (or use existing account) at **https://theartshops.netlify.app/sign-up**
2. Verify your email
3. Go to **Supabase Dashboard → Authentication → Users**
4. Find your user - copy their **UUID** (looks like: `a1b2c3d4-e5f6-...`)
5. Click **SQL Editor**
6. Create a new query and run:

```sql
INSERT INTO public.admin_users (user_id, display_name, active) 
VALUES ('YOUR_USER_UUID_HERE', 'Your Name', true)
ON CONFLICT DO NOTHING;
```

Replace `YOUR_USER_UUID_HERE` with the actual UUID you copied.

7. Click **Run**
8. Now you can log in at `/admin/login` with your email/password!

---

## Phase 4: Setup Demo Data (Optional but Recommended)

### Add Sample Coupons
Run in **SQL Editor**:

```sql
INSERT INTO public.coupons (code, discount_type, discount_value, minimum_purchase, max_uses, valid_from, valid_until, active)
VALUES
  ('WELCOME10', 'percentage', 10, 0, 100, now(), now() + interval '30 days', true),
  ('SAVE500', 'fixed', 500, 2000, 50, now(), now() + interval '30 days', true),
  ('ARTLOVER20', 'percentage', 20, 5000, 25, now(), now() + interval '7 days', true)
ON CONFLICT(code) DO NOTHING;
```

### Test Coupons
1. In checkout, enter: `WELCOME10` (gets 10% off)
2. Or: `SAVE500` (gets ₹500 off on purchases over ₹2000)

---

## Phase 5: Product Inventory Setup

### Add Stock to Existing Products
1. Go to `/admin/dashboard` → **Products** tab
2. Click **Edit** on any product
3. Scroll to **Inventory** section
4. Set stock for each size (S, L, XL)
5. Click **Save Product**
6. Stock is now tracked!

### What Inventory Does
- Prevents overselling (can't buy more than available)
- Shows "In Stock" / "Low Stock" / "Out of Stock" badges
- Alerts you when stock gets low

---

## Phase 6: Customer Reviews & Ratings

### How Customers Leave Reviews
1. Customer must be logged in
2. They go to any product detail page (not yet built - coming soon!)
3. Scroll to **Reviews** section
4. Click **Write a Review**
5. Rate (1-5 stars) and write comment
6. Review appears instantly for others to see

### How Admins Moderate Reviews
1. Go to `/admin/dashboard`
2. Edit a product
3. Scroll to **Customer Reviews** section
4. View all reviews + ratings
5. Delete any inappropriate reviews

### Auto-Calculated Ratings
- Average rating is auto-calculated from all reviews
- Displayed as ⭐ badge on product cards
- Updates instantly when reviews added/removed

---

## Phase 7: Wishlist Feature

### For Customers
1. Click **Add to Wishlist** button on any product
2. View wishlist at `/wishlist` page
3. Remove items from wishlist anytime
4. Wishlist persists even if user logs out!

### For Admins
- View wishlist usage in analytics (coming soon)
- See which products are wishlisted most

---

## Phase 8: Shopping Cart Enhancements

### Persistent Cart (New)
1. Items now **saved to database**, not just browser
2. Customer login → their cart loads automatically
3. Switch devices → cart follows them!
4. No more lost carts!

### Cart Features
- Update quantities directly
- Save for later (move to wishlist)
- Apply coupon codes at checkout
- View total price with discounts applied

---

## Phase 9: Testing Checklist

### Before Going Live ✅

#### Admin Features
- [ ] Can login to `/admin/login`
- [ ] Can view orders in admin dashboard
- [ ] Can create new product with all 3 image methods:
  - [ ] Upload image file
  - [ ] Provide image URL
  - [ ] Provide local file path
- [ ] Can set inventory per size
- [ ] Can mark product active/hidden
- [ ] Can view inventory on product edit panel

#### Customer Features
- [ ] Can add product to cart
- [ ] Can add product to wishlist
- [ ] Can view wishlist page
- [ ] Can apply coupon code (test with `WELCOME10`)
- [ ] Can see product rating if reviews exist
- [ ] Cart persists after logout/login (if logged in)
- [ ] Can leave a review (product detail page - coming next)

#### Image Handling
- [ ] Images uploaded via admin appear on storefront
- [ ] Images from URLs appear correctly
- [ ] Local file paths still work
- [ ] Can fallback to old data without errors

---

## Phase 10: Deployment

### Push Changes to GitHub
```bash
git add .
git commit -m "Add Amazon-level features: image upload, inventory, reviews, wishlist, coupons"
git push
```

### Netlify Auto-Deploys
- Your site updates automatically in 2-3 minutes
- Check Netlify dashboard for **Deploy Preview**

### Netlify Environment Variables
- Set the same frontend variables from `.env.example` in **Site settings → Build & deploy → Environment**.
- Required for production: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_EMAIL_REDIRECT_URL`.
- If the API runs somewhere else, set `VITE_API_BASE_URL` too.
- If you use Mapbox on mobile or desktop, also set `VITE_MAPBOX_TOKEN`.

### Verify in Production
1. Visit **https://theartshops.netlify.app/**
2. Run through testing checklist above
3. All features should work exactly as dev!

---

## Troubleshooting

### Images Not Uploading?
1. Check **Storage → product-images bucket** exists and is **Public**
2. Check browser console for errors (F12 → Console tab)
3. Try uploading smaller images (<2MB)

### Can't Login to Admin?
1. Went through **Phase 3** and created admin user? (Check SQL)
2. Using correct email/password? (Should match auth signup)
3. Check console for RLS policy errors

### Reviews Not Saving?
1. Customer must be **logged in** (not just visiting)
2. Check **Database → customer_reviews** table has rows
3. RLS policies might need debugging (check Supabase logs)

### Coupons Not Working?
1. Verify coupon was **inserted in coupons table**
2. Check `valid_from` and `valid_until` dates
3. Check `max_uses` hasn't been reached
4. Check cart total meets `minimum_purchase`

### Inventory Not Tracking?
1. Verify **inventory_variants table** has rows for product
2. When editing product, scroll down to see inventory fields
3. Try refreshing page if inventory doesn't load

---

## Next Steps (Roadmap)

### Already Built & Ready
✅ Image upload + link support
✅ Inventory management  
✅ Customer reviews system
✅ Wishlist feature
✅ Coupon/discount system
✅ Persistent shopping cart

### Coming Next (Build These If Needed)
- [ ] Product detail page with full reviews display
- [ ] Customer order history page
- [ ] Advanced analytics dashboard
- [ ] Email notifications on order status
- [ ] Return/refund management
- [ ] Multi-admin management UI
- [ ] Bulk product import/export
- [ ] Search & advanced filtering
- [ ] Recommendation algorithm

---

## Key Files Modified

### Schema
- `supabase/schema.sql` - New tables, functions, RLS policies

### Frontend
- `src/pages/AdminDashboardPage.jsx` - Image upload, inventory UI
- `src/lib/adminApi.js` - Image upload function, inventory API

### Next to Build
- Product detail page component
- Wishlist page component
- Customer reviews display component
- Search/filter component

---

## Support & Questions

If you encounter issues:
1. Check **This File** (Troubleshooting section above)
2. Check **Supabase Logs**: Dashboard → Logs → Past Hour
3. Check **Browser Console**: F12 → Console tab
4. Review **Schema** in SQL Editor to verify tables exist

---

**🎉 Your site is now an Amazon-level e-commerce platform!** 🚀

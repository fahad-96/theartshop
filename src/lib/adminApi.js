export const isAdminUser = async (supabase) => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user || null;
  if (!user) return false;

  const { data, error } = await supabase.rpc("is_admin_user");
  if (error) throw error;

  return Boolean(data);
};

export const uploadProductImage = async (supabase, file, productId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${productId}-${Date.now()}.${fileExt}`;
  const objectPath = `products/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(objectPath, file, { upsert: false });

  if (error) {
    const rawMessage = String(error.message || "").toLowerCase();
    if (rawMessage.includes("row-level security")) {
      throw new Error("Image upload failed: storage permission is blocked. Run the latest storage policies in schema.sql and confirm your user is in admin_users.");
    }
    throw new Error(`Image upload failed: ${error.message}`);
  }
  
  const resolvedPath = data?.path || objectPath;
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(resolvedPath);
  
  return publicUrl;
};

export const fetchAdminOrders = async (supabase, filters = {}) => {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", new Date(filters.dateFrom).toISOString());
  }

  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    query = query.or(`order_ref.ilike.%${term}%,id.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const fetchAdminProducts = async (supabase, filters = {}) => {
  let query = supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (filters.status && filters.status !== "all") {
    if (filters.status === "active") query = query.eq("is_active", true);
    if (filters.status === "inactive") query = query.eq("is_active", false);
    if (filters.status === "draft") query = query.eq("publish_status", "draft");
    if (filters.status === "published") query = query.eq("publish_status", "published");
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,category.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const saveAdminProduct = async (supabase, payload) => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user || null;
  if (!user) throw new Error("Admin session not found.");

  const conflictKey = payload.id ? "id" : "slug";
  const basePayload = {
    ...payload,
    created_by: payload.created_by || user.id,
    updated_by: user.id,
  };

  const legacyPayload = { ...basePayload };
  delete legacyPayload.image_gallery;
  delete legacyPayload.publish_status;

  const isSchemaCacheColumnError = (errorMessage) => {
    const text = String(errorMessage || "").toLowerCase();
    return (
      text.includes("schema cache") ||
      text.includes("could not find the 'publish_status' column") ||
      text.includes("could not find the 'image_gallery' column") ||
      text.includes("publish_status") ||
      text.includes("image_gallery")
    );
  };

  const { data, error } = await supabase
    .from("products")
    .upsert(basePayload, { onConflict: conflictKey })
    .select("*")
    .single();

  if (error) {
    const errorMessage = String(error.message || "");
    if (!isSchemaCacheColumnError(errorMessage)) {
      throw error;
    }

    const retry = await supabase
      .from("products")
      .upsert(legacyPayload, { onConflict: conflictKey })
      .select("*")
      .single();

    if (retry.error) throw retry.error;
    return retry.data;
  }
  return data;
};

export const deleteAdminProduct = async (supabase, productId) => {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw error;
  return true;
};

export const bulkSetProductsActive = async (supabase, productIds, isActive) => {
  if (!Array.isArray(productIds) || !productIds.length) return [];
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .in("id", productIds)
    .select("id");

  if (error) throw error;
  return data || [];
};

export const saveInventory = async (supabase, productId, size, stockCount) => {
  const { data, error } = await supabase
    .from('inventory_variants')
    .upsert(
      {
        product_id: productId,
        size,
        stock_count: stockCount,
      },
      { onConflict: 'product_id,size' }
    )
    .select();

  if (error) throw new Error(`Save inventory failed: ${error.message}`);
  return data?.[0] || null;
};

export const fetchProductInventory = async (supabase, productId) => {
  const { data, error } = await supabase
    .from('inventory_variants')
    .select('*')
    .eq('product_id', productId);

  if (error) throw new Error(`Fetch inventory failed: ${error.message}`);
  return data || [];
};

export const updateAdminOrderStatus = async (supabase, orderId, status) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const fetchProductReviews = async (supabase, productId) => {
  const { data, error } = await supabase
    .from('customer_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Fetch reviews failed: ${error.message}`);
  return data || [];
};

export const fetchAdminReviews = async (supabase, filters = {}) => {
  let query = supabase
    .from("customer_reviews")
    .select("*, products(title, slug)")
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("review_status", filters.status);
  }

  if (filters.productId && filters.productId !== "all") {
    query = query.eq("product_id", filters.productId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Fetch admin reviews failed: ${error.message}`);
  return data || [];
};

export const updateReviewStatus = async (supabase, reviewId, reviewStatus) => {
  const { data, error } = await supabase
    .from("customer_reviews")
    .update({ review_status: reviewStatus })
    .eq("id", reviewId)
    .select("*")
    .single();

  if (error) throw new Error(`Update review failed: ${error.message}`);
  return data;
};

export const deleteReview = async (supabase, reviewId) => {
  const { error } = await supabase
    .from("customer_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) throw new Error(`Delete review failed: ${error.message}`);
  return true;
};

export const saveProductReview = async (supabase, productId, review) => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user || null;
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('customer_reviews')
    .upsert(
      {
        product_id: productId,
        user_id: user.id,
        ...review,
      },
      { onConflict: 'product_id,user_id' }
    )
    .select();

  if (error) throw new Error(`Save review failed: ${error.message}`);
  return data?.[0] || null;
};

// ── Customer Management ──

export const fetchAdminCustomers = async (supabase, filters = {}) => {
  const searchTerm = filters.search?.trim() || "";
  const { data, error } = await supabase.rpc("admin_list_customers", {
    search_term: searchTerm,
  });
  if (error) throw new Error(`Fetch customers failed: ${error.message}`);
  return data || [];
};

export const fetchCustomerOrders = async (supabase, userId) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Fetch customer orders failed: ${error.message}`);
  return data || [];
};

export const banCustomer = async (supabase, userId) => {
  const { data, error } = await supabase.rpc("admin_ban_user", { target_user_id: userId });
  if (error) throw new Error(`Ban user failed: ${error.message}`);
  return data;
};

export const unbanCustomer = async (supabase, userId) => {
  const { data, error } = await supabase.rpc("admin_unban_user", { target_user_id: userId });
  if (error) throw new Error(`Unban user failed: ${error.message}`);
  return data;
};

export const deleteCustomer = async (supabase, userId) => {
  const { data, error } = await supabase.rpc("admin_delete_user", { target_user_id: userId });
  if (error) throw new Error(`Delete user failed: ${error.message}`);
  return data;
};

// ── Coupon Management ──

export const fetchAdminCoupons = async (supabase) => {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Fetch coupons failed: ${error.message}`);
  return data || [];
};

export const saveAdminCoupon = async (supabase, payload) => {
  const { data, error } = await supabase
    .from("coupons")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(`Save coupon failed: ${error.message}`);
  return data;
};

export const deleteAdminCoupon = async (supabase, couponId) => {
  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", couponId);

  if (error) throw new Error(`Delete coupon failed: ${error.message}`);
  return true;
};

export const applyCoupon = async (supabase, couponCode, cartTotal) => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', couponCode)
    .single();

  if (error || !data) throw new Error('Coupon not found or invalid');
  
  if (!data.active) throw new Error('Coupon is inactive');
  if (data.max_uses && data.current_uses >= data.max_uses) throw new Error('Coupon limit reached');
  
  const now = new Date();
  if (data.valid_from && new Date(data.valid_from) > now) throw new Error('Coupon is not yet active');
  if (data.valid_until && new Date(data.valid_until) < now) throw new Error('Coupon has expired');
  
  if (cartTotal < data.minimum_purchase) {
    throw new Error(`Minimum purchase of ₹${data.minimum_purchase} required`);
  }

  let discount = 0;
  if (data.discount_type === 'percentage') {
    discount = (cartTotal * data.discount_value) / 100;
  } else {
    discount = data.discount_value;
  }

  return {
    id: data.id,
    code: data.code,
    discount: Math.min(discount, cartTotal),
    discountType: data.discount_type,
    discountValue: data.discount_value,
  };
};

export const incrementCouponUsage = async (supabase, couponId) => {
  const { error } = await supabase.rpc("increment_coupon_usage", { coupon_id: couponId });
  if (error) {
    // Fallback: manual increment
    const { data } = await supabase.from("coupons").select("current_uses").eq("id", couponId).single();
    if (data) {
      await supabase.from("coupons").update({ current_uses: (data.current_uses || 0) + 1 }).eq("id", couponId);
    }
  }
};

export const seedHardcodedProducts = async (supabase, hardcodedProducts) => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) throw new Error("Not authenticated");

  let seeded = 0;
  for (const product of hardcodedProducts) {
    const slug = product.slug;
    // Check if already exists
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) continue;

    const payload = {
      slug,
      title: product.title,
      image_path: product.src || "",
      image_url: product.src || "",
      image_gallery: [],
      category: product.category || "Art",
      info: product.info || "",
      short_info: product.shortInfo || "",
      pricing: product.pricing || { S: 599, L: 999, XL: 1499 },
      sort_order: Number(product.id || 0),
      is_active: true,
      publish_status: "published",
      created_by: user.id,
      updated_by: user.id,
    };

    const { error } = await supabase.from("products").insert(payload);
    if (!error) seeded++;
  }

  return seeded;
};

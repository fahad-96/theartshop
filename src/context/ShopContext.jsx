import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mapProductRowToProduct, products as defaultProducts, slugifyProductTitle } from "../data/products";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const ShopContext = createContext(null);

const CART_STORAGE_KEY = "tas-cart";
const WISHLIST_STORAGE_KEY = "tas-wishlist";

const EMPTY_SHIPPING_DETAILS = {
  fullName: "",
  phone: "",
  landmark: "",
  address: "",
};

const normalizeShippingDetails = (source, fallbackName = "") => {
  if (!source) return { ...EMPTY_SHIPPING_DETAILS, fullName: fallbackName || "" };
  if (typeof source === "string") {
    return { ...EMPTY_SHIPPING_DETAILS, fullName: fallbackName || "", address: source };
  }

  return {
    fullName: source.fullName || fallbackName || "",
    phone: source.phone || "",
    landmark: source.landmark || "",
    address: source.address || "",
  };
};

const profileRowToDetails = (profile, fallbackName = "") => ({
  fullName: profile?.full_name || fallbackName || "",
  phone: profile?.phone || "",
  landmark: profile?.landmark || "",
  address: profile?.address || "",
});

const detailsToProfileRow = (user, details) => ({
  user_id: user.id,
  email: user.email,
  full_name: details.fullName || user.user_metadata?.full_name || user.email,
  phone: details.phone || "",
  landmark: details.landmark || "",
  address: details.address || "",
});

const mapOrderRowToState = (row) => ({
  id: row.order_ref || row.id,
  date: (row.created_at || new Date().toISOString()).slice(0, 10),
  amount: Number(row.amount) || 0,
  status: row.status || "Placed",
  items: Array.isArray(row.items) ? row.items : [],
  shipping: row.shipping || {},
  payment: row.payment || {},
});

const buildOrderState = (cartItems, cartSubtotal, shippingDetails, paymentInfo, getProductById) => ({
  id: paymentInfo?.razorpayOrderId || `ord-${Date.now()}`,
  date: new Date().toISOString().slice(0, 10),
  amount: cartSubtotal,
  status: paymentInfo?.status ? String(paymentInfo.status).charAt(0).toUpperCase() + String(paymentInfo.status).slice(1) : "Placed",
  items: cartItems.map((item) => {
    const product = getProductById(item.productId);
    return {
      title: product?.title || "Unknown",
      size: item.size,
      qty: item.qty,
    };
  }),
  shipping: shippingDetails,
  payment: paymentInfo,
});

const BLOCKING_ORDER_STATUSES = new Set(["placed", "processing", "pending"]);
const hasBlockingOrderStatus = (status) => BLOCKING_ORDER_STATUSES.has(String(status || "").toLowerCase());

const withTimeout = async (promise, timeoutMs = 15000, timeoutMessage = "Request timed out.") => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const TRANSIENT_ORDER_ERROR_PATTERNS = [
  "network",
  "fetch",
  "timed out",
  "timeout",
  "failed to fetch",
  "gateway",
  "temporarily unavailable",
  "connection",
];

const isTransientOrderError = (error) => {
  const text = String(error?.message || error || "").toLowerCase();
  return TRANSIENT_ORDER_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function ShopProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const [products, setProducts] = useState(defaultProducts);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [pendingBuy, setPendingBuy] = useState(null);
  const [authError, setAuthError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [shippingDetails, setShippingDetails] = useState(EMPTY_SHIPPING_DETAILS);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) setCartItems(JSON.parse(storedCart));
    
    const storedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (storedWishlist) setWishlistItems(JSON.parse(storedWishlist));
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const loadCatalog = async () => {
    try {
      if (!isSupabaseConfigured || !supabase) {
        setProducts(defaultProducts);
        setCatalogReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rowsWithResolvedImages = await Promise.all(
        (data || []).map(async (row) => {
          const imageUrl = String(row?.image_url || "").trim();
          const fromPublicPath = "/storage/v1/object/public/product-images/";

          let objectPath = "";
          if (imageUrl.includes(fromPublicPath)) {
            objectPath = imageUrl.split(fromPublicPath)[1] || "";
          } else {
            const imagePath = String(row?.image_path || "").trim();
            if (imagePath && !imagePath.startsWith("http://") && !imagePath.startsWith("https://") && !imagePath.startsWith("/")) {
              objectPath = imagePath.replace(/^\/+/, "");
            }
          }

          if (!objectPath) return row;

          const { data: signedData, error: signedError } = await supabase.storage
            .from("product-images")
            .createSignedUrl(objectPath, 60 * 60 * 24 * 7);

          if (signedError || !signedData?.signedUrl) return row;
          return { ...row, image_url: signedData.signedUrl };
        })
      );

      const mappedProducts = rowsWithResolvedImages.map(mapProductRowToProduct);
      if (!mappedProducts.length) {
        setProducts(defaultProducts);
      } else {
        const mergedBySlug = new Map(
          defaultProducts.map((product) => [product.slug || slugifyProductTitle(product.title), product])
        );

        mappedProducts.forEach((product) => {
          mergedBySlug.set(product.slug || slugifyProductTitle(product.title), product);
        });

        setProducts(Array.from(mergedBySlug.values()));
      }
      setCatalogReady(true);
    } catch (error) {
      console.error("Catalog load failed", error);
      setProducts(defaultProducts);
      setCatalogReady(true);
    }
  };

  const clearAuthState = () => {
    setAuthUser(null);
    setPendingBuy(null);
    setAuthError("");
    setShippingDetails(EMPTY_SHIPPING_DETAILS);
    setOrders([]);
    setAuthReady(true);
  };

  const hydrateSupabaseUser = async (user) => {
    if (!user) {
      clearAuthState();
      return;
    }

    const fallbackName = user.user_metadata?.full_name || user.email || "";
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    let resolvedProfile = profile;
    if (!resolvedProfile) {
      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            email: user.email,
            full_name: fallbackName,
            phone: "",
            landmark: "",
            address: "",
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (insertError) throw insertError;
      resolvedProfile = insertedProfile;
    }

    const nextDetails = profileRowToDetails(resolvedProfile, fallbackName);
    setAuthUser({
      id: user.id,
      name: nextDetails.fullName || fallbackName,
      email: user.email,
      address: nextDetails.address,
      addressDetails: nextDetails,
    });
    setShippingDetails(nextDetails);

    const { data: orderRows, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (orderError) throw orderError;
    setOrders((orderRows || []).map(mapOrderRowToState));
    setAuthReady(true);
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        await loadCatalog();

        if (!isSupabaseConfigured || !supabase) {
          clearAuthState();
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const sessionUser = data.session?.user || null;
        if (sessionUser) {
          await hydrateSupabaseUser(sessionUser);
        } else {
          clearAuthState();
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;
          try {
            if (session?.user) {
              await hydrateSupabaseUser(session.user);
            } else {
              clearAuthState();
            }
          } catch (authError) {
            console.error("Supabase auth sync failed", authError);
            clearAuthState();
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Auth bootstrap failed", error);
        clearAuthState();
      }
    };

    const cleanupPromise = boot();
    return () => {
      mounted = false;
      if (cleanupPromise && typeof cleanupPromise.then === "function") {
        cleanupPromise.then((cleanup) => {
          if (typeof cleanup === "function") cleanup();
        });
      }
    };
  }, []);

  const shippingAddress = shippingDetails.address;
  const setShippingAddress = (address) => setShippingDetails((prev) => ({ ...prev, address }));

  const getProductById = (productId) => products.find((p) => String(p.id) === String(productId));

  const getPerArtQty = (productId) => {
    return cartItems
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.qty, 0);
  };

  const addToCart = (product, size) => {
    const currentPerArt = getPerArtQty(product.id);
    if (currentPerArt >= 10) {
      setCartMessage(`Maximum limit reached for ${product.title}. You can add up to 10 only.`);
      return { ok: false };
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.size === size
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + 1 };
        return updated;
      }

      return [...prev, { productId: product.id, size, qty: 1 }];
    });

    setCartMessage(`${product.title} (${size}) added to cart.`);
    return { ok: true };
  };

  const handleBuy = (product, size) => {
    if (!authUser) {
      setPendingBuy({ productId: product.id, size });
      setAuthError("Please login first to continue buying.");
      return { requiresAuth: true };
    }

    const result = addToCart(product, size);
    return { requiresAuth: false, added: result.ok };
  };

  const fulfillPendingBuy = () => {
    if (!pendingBuy) return { added: false };

    const product = getProductById(pendingBuy.productId);
    if (!product) {
      setPendingBuy(null);
      return { added: false };
    }

    const result = addToCart(product, pendingBuy.size);
    setPendingBuy(null);
    return { added: result.ok };
  };

  const updateCartQty = (productId, size, nextQty) => {
    if (nextQty < 1) return;

    const existingOtherQty = cartItems
      .filter((item) => item.productId === productId && item.size !== size)
      .reduce((sum, item) => sum + item.qty, 0);

    if (existingOtherQty + nextQty > 10) {
      const product = getProductById(productId);
      setCartMessage(`Maximum limit for ${product?.title || "this art"} is 10.`);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.size === size ? { ...item, qty: nextQty } : item
      )
    );
  };

  const removeCartItem = (productId, size) => {
    setCartItems((prev) => prev.filter((item) => !(item.productId === productId && item.size === size)));
  };

  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.qty, 0), [cartItems]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const product = getProductById(item.productId);
      if (!product) return sum;
      return sum + product.pricing[item.size] * item.qty;
    }, 0);
  }, [cartItems]);

  const login = async ({ email, password }) => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthError("Authentication service is not configured.");
      return { ok: false };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setAuthError(error.message);
      return { ok: false };
    }

    const sessionUser = data.session?.user || data.user || null;
    if (sessionUser) await hydrateSupabaseUser(sessionUser);
    setAuthError("");
    return { ok: true };
  };

  const signup = async ({ name, email, password, address = "" }) => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthError("Authentication service is not configured.");
      return { ok: false };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRedirectTo = `${window.location.origin}${import.meta.env.BASE_URL}auth/confirmed`;
    const signupOptions = {
      data: { full_name: name.trim() },
      emailRedirectTo,
    };

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: signupOptions,
    });

    if (error) {
      setAuthError(error.message);
      return { ok: false };
    }

    if (!data.session?.user) {
      setAuthError("Please verify your email to activate your account.");
      return { ok: false, needsLogin: true };
    }

    const sessionUser = data.session.user;
    const nextDetails = {
      fullName: name.trim(),
      phone: "",
      landmark: "",
      address: (address || "").trim(),
    };

    const { error: profileError } = await supabase.from("profiles").upsert(
      detailsToProfileRow(sessionUser, nextDetails),
      { onConflict: "user_id" }
    );

    if (profileError) {
      setAuthError(profileError.message);
      return { ok: false };
    }

    await hydrateSupabaseUser(sessionUser);
    setShippingDetails(nextDetails);
    setAuthError("");
    return { ok: true };
  };

  const logout = async () => {
    clearAuthState();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Logout failed", error);
      }
    }
    window.location.href = "/";
  };

  const changePasswordWithCurrent = async ({ currentPassword, newPassword }) => {
    try {
      if (!authUser?.email) return { ok: false, message: "Please login first." };
      if (!isSupabaseConfigured || !supabase) return { ok: false, message: "Authentication service is not configured." };

      const trimmedCurrent = currentPassword?.trim() || "";
      const trimmedNext = newPassword?.trim() || "";
      if (!trimmedCurrent || !trimmedNext) {
        return { ok: false, message: "Current password and new password are required." };
      }

      if (trimmedNext.length < 6) {
        return { ok: false, message: "New password must be at least 6 characters." };
      }

      const { error: reauthError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: authUser.email,
          password: trimmedCurrent,
        }),
        15000,
        "Password verification timed out. Please try again."
      );

      if (reauthError) {
        return { ok: false, message: "Current password is incorrect." };
      }

      const { error: updateError } = await withTimeout(
        supabase.auth.updateUser({ password: trimmedNext }),
        15000,
        "Password update timed out. Please try again."
      );
      if (updateError) {
        return { ok: false, message: updateError.message || "Password update failed." };
      }

      return { ok: true, message: "Password changed successfully." };
    } catch (error) {
      return { ok: false, message: error.message || "Could not change password." };
    }
  };

  const deleteAccountWithPassword = async ({ password }) => {
    try {
      if (!authUser?.email) return { ok: false, message: "Please login first." };
      if (!isSupabaseConfigured || !supabase || !authUser.id) {
        return { ok: false, message: "Authentication service is not configured." };
      }

      const trimmedPassword = password?.trim() || "";
      if (!trimmedPassword) return { ok: false, message: "Password is required to delete account." };

      const localBlockingOrders = orders.filter((order) => hasBlockingOrderStatus(order.status));
      if (localBlockingOrders.length > 0) {
        return { ok: false, message: "Account deletion is blocked because you have pending orders." };
      }

      const { data: latestOrders, error: orderError } = await withTimeout(
        supabase
          .from("orders")
          .select("status")
          .eq("user_id", authUser.id),
        15000,
        "Order check timed out. Please try again."
      );

      if (orderError) {
        return { ok: false, message: orderError.message || "Could not validate order status." };
      }

      const hasPending = (latestOrders || []).some((order) => hasBlockingOrderStatus(order.status));
      if (hasPending) {
        return { ok: false, message: "Account deletion is blocked because you have pending orders." };
      }

      const { error: deleteError } = await withTimeout(
        supabase.rpc("delete_own_account", { delete_password: trimmedPassword }),
        15000,
        "Account deletion timed out. Please try again."
      );
      if (deleteError) {
        const rpcMissing = String(deleteError.message || "").toLowerCase().includes("delete_own_account")
          && String(deleteError.message || "").toLowerCase().includes("not found");

        if (rpcMissing) {
          return { ok: false, message: "Account deletion service is not installed yet. Please run the latest schema SQL once." };
        }
        return { ok: false, message: deleteError.message || "Account deletion failed." };
      }

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        return { ok: false, message: signOutError.message || "Account deleted, but logout failed. Please refresh." };
      }

      setCartItems([]);
      setWishlistItems([]);
      setOrders([]);
      clearAuthState();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message || "Account deletion failed." };
    }
  };

  const updateProfileAddressDetails = async (details) => {
    if (!authUser) return { ok: false };

    const normalized = normalizeShippingDetails(details, authUser.name);
    setShippingDetails(normalized);
    setAuthUser((prev) => (prev ? { ...prev, address: normalized.address, addressDetails: normalized } : prev));

    if (isSupabaseConfigured && supabase && authUser.id) {
      const { error } = await supabase.from("profiles").upsert(
        detailsToProfileRow(
          { id: authUser.id, email: authUser.email, user_metadata: { full_name: authUser.name } },
          normalized
        ),
        { onConflict: "user_id" }
      );

      if (error) {
        setAuthError(error.message);
        return { ok: false };
      }
    }

    return { ok: true };
  };

  const updateProfileAddress = (address) => updateProfileAddressDetails({ ...shippingDetails, address: address.trim() });

  const validateCheckoutReadiness = () => {
    if (!authUser) {
      setAuthError("Please login first.");
      return { requiresAuth: true, ok: false };
    }

    if (!shippingDetails.fullName.trim() || !shippingDetails.phone.trim() || !shippingDetails.address.trim()) {
      setCartMessage("Please complete name, phone, and map address in Profile before placing order.");
      return { requiresAuth: false, ok: false };
    }

    if (!cartItems.length) {
      setCartMessage("Cart is empty.");
      return { requiresAuth: false, ok: false };
    }

    return { requiresAuth: false, ok: true };
  };

  const saveSupabaseOrder = async (orderState) => {
    const payload = {
      user_id: authUser.id,
      order_ref: orderState.id,
      amount: orderState.amount,
      currency: "INR",
      status: orderState.status,
      items: orderState.items,
      shipping: orderState.shipping,
      payment: orderState.payment || {},
    };

    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data, error } = await supabase.from("orders").insert(payload).select("*").single();

      if (!error) {
        const normalized = mapOrderRowToState(data);
        setOrders((prev) => [normalized, ...prev]);
        return normalized;
      }

      const errorText = String(error?.message || "").toLowerCase();
      if (errorText.includes("duplicate key") || errorText.includes("orders_order_ref_key")) {
        const { data: existing, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("order_ref", orderState.id)
          .maybeSingle();

        if (!fetchError && existing) {
          const normalized = mapOrderRowToState(existing);
          setOrders((prev) => {
            const withoutDuplicate = prev.filter((row) => String(row.id) !== String(normalized.id));
            return [normalized, ...withoutDuplicate];
          });
          return normalized;
        }
      }

      lastError = error;
      if (!isTransientOrderError(error) || attempt === 1) break;
      await delay(700);
    }

    throw lastError || new Error("Order could not be saved.");
  };

  const finalizePaidOrder = async (paymentInfo = null) => {
    const readiness = validateCheckoutReadiness();
    if (!readiness.ok) {
      return {
        ...readiness,
        message: cartMessage || authError || "Please complete checkout details before payment.",
      };
    }

    const orderState = buildOrderState(cartItems, cartSubtotal, shippingDetails, paymentInfo, getProductById);

    try {
      if (!isSupabaseConfigured || !supabase || !authUser?.id) {
        const message = "Order service is not configured.";
        setCartMessage(message);
        return { requiresAuth: false, ok: false, message };
      }

      await saveSupabaseOrder(orderState);

      setCartItems([]);
      await updateProfileAddressDetails(shippingDetails);
      const message = "Order placed successfully. We will contact you soon.";
      setCartMessage(message);
      return { requiresAuth: false, ok: true, message };
    } catch (error) {
      const message = error?.message || "Order could not be saved.";
      setCartMessage(message);
      return { requiresAuth: false, ok: false, message };
    }
  };

  const handleMockCheckout = () => finalizePaidOrder({ provider: "mock", status: "paid" });

  const addToWishlist = (productId) => {
    setWishlistItems((prev) => {
      if (prev.includes(productId)) return prev;
      return [...prev, productId];
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems((prev) => prev.filter((id) => id !== productId));
  };

  const toggleWishlist = (productId) => {
    setWishlistItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  return (
    <ShopContext.Provider
      value={{
        products,
        catalogReady,
        authUser,
        authReady,
        cartItems,
        cartCount,
        cartSubtotal,
        wishlistItems,
        shippingDetails,
        setShippingDetails,
        shippingAddress,
        setShippingAddress,
        cartMessage,
        setCartMessage,
        authError,
        setAuthError,
        orders,
        login,
        signup,
        logout,
        changePasswordWithCurrent,
        deleteAccountWithPassword,
        updateProfileAddressDetails,
        updateProfileAddress,
        addToCart,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        handleBuy,
        fulfillPendingBuy,
        updateCartQty,
        removeCartItem,
        getProductById,
        refreshProducts: loadCatalog,
        validateCheckoutReadiness,
        finalizePaidOrder,
        handleMockCheckout,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used within ShopProvider");
  return context;
}

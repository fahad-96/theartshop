import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mapProductRowToProduct, products as defaultProducts, slugifyProductTitle } from "../data/products";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const ShopContext = createContext(null);

const USERS_STORAGE_KEY = "tas-users";
const CURRENT_USER_STORAGE_KEY = "tas-current-user";
const CART_STORAGE_KEY = "tas-cart";
const ORDERS_STORAGE_KEY = "tas-orders";
const WISHLIST_STORAGE_KEY = "tas-wishlist";
const SUPABASE_EMAIL_REDIRECT_URL = import.meta.env.VITE_SUPABASE_EMAIL_REDIRECT_URL;

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

const localOrdersMap = () => {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const seedOrdersFor = (email) => ([
  {
    id: `mock-${email}-1`,
    date: "2026-03-10",
    amount: 2997,
    status: "Delivered",
    items: [
      { title: "MESSI", size: "L", qty: 1 },
      { title: "THINK", size: "S", qty: 2 },
    ],
  },
  {
    id: `mock-${email}-2`,
    date: "2026-02-02",
    amount: 1499,
    status: "Shipped",
    items: [{ title: "DEER HEAD", size: "L", qty: 1 }],
  },
]);

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
  id: `ord-${Date.now()}`,
  date: new Date().toISOString().slice(0, 10),
  amount: cartSubtotal,
  status: "Placed",
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

    const bootLocal = () => {
      const storedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (!storedUser) {
        clearAuthState();
        return;
      }

      try {
        const parsed = JSON.parse(storedUser);
        setAuthUser(parsed);
        const details = normalizeShippingDetails(parsed.addressDetails || parsed.address, parsed.name);
        setShippingDetails(details);

        const ordersMap = localOrdersMap();
        if (!ordersMap[parsed.email]) {
          ordersMap[parsed.email] = seedOrdersFor(parsed.email);
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersMap));
        }
        setOrders(ordersMap[parsed.email] || []);
      } catch {
        clearAuthState();
      }

      setAuthReady(true);
    };

    const boot = async () => {
      try {
        await loadCatalog();

        if (!isSupabaseConfigured || !supabase) {
          bootLocal();
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
        bootLocal();
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
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
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
    }

    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
    const found = users.find((user) => user.email === normalizedEmail && user.password === password);

    if (!found) {
      setAuthError("Invalid email or password.");
      return { ok: false };
    }

    setAuthUser({
      name: found.name,
      email: found.email,
      address: found.address,
      addressDetails: normalizeShippingDetails(found.addressDetails || found.address, found.name),
    });
    setShippingDetails(normalizeShippingDetails(found.addressDetails || found.address, found.name));
    setAuthError("");
    return { ok: true };
  };

  const signup = async ({ name, email, password, address = "" }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRedirectTo = `${window.location.origin}${import.meta.env.BASE_URL}auth/confirmed`;
    const signupOptions = {
      data: { full_name: name.trim() },
      emailRedirectTo,
    };

    if (isSupabaseConfigured && supabase) {
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
    }

    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
    const already = users.find((user) => user.email === normalizedEmail);

    if (already) {
      setAuthError("An account with this email already exists.");
      return { ok: false };
    }

    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password,
      address: (address || "").trim(),
      addressDetails: {
        fullName: name.trim(),
        phone: "",
        landmark: "",
        address: (address || "").trim(),
      },
    };

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([...users, newUser]));
    setAuthUser({
      name: newUser.name,
      email: newUser.email,
      address: newUser.address,
      addressDetails: newUser.addressDetails,
    });
    setShippingDetails(newUser.addressDetails);
    setAuthError("");
    return { ok: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      setPendingBuy(null);
      setAuthError("");
      await supabase.auth.signOut();
      return;
    }

    setAuthUser(null);
    setPendingBuy(null);
    setAuthError("");
  };

  const changePasswordWithCurrent = async ({ currentPassword, newPassword }) => {
    try {
      if (!authUser?.email) return { ok: false, message: "Please login first." };

      const trimmedCurrent = currentPassword?.trim() || "";
      const trimmedNext = newPassword?.trim() || "";
      if (!trimmedCurrent || !trimmedNext) {
        return { ok: false, message: "Current password and new password are required." };
      }

      if (trimmedNext.length < 6) {
        return { ok: false, message: "New password must be at least 6 characters." };
      }

      if (isSupabaseConfigured && supabase) {
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
      }

      const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
      const userIndex = users.findIndex((user) => user.email === authUser.email);
      if (userIndex === -1) return { ok: false, message: "Account not found." };
      if (users[userIndex].password !== trimmedCurrent) return { ok: false, message: "Current password is incorrect." };

      users[userIndex] = { ...users[userIndex], password: trimmedNext };
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      return { ok: true, message: "Password changed successfully." };
    } catch (error) {
      return { ok: false, message: error.message || "Could not change password." };
    }
  };

  const deleteAccountWithPassword = async ({ password }) => {
    try {
      if (!authUser?.email) return { ok: false, message: "Please login first." };

      const trimmedPassword = password?.trim() || "";
      if (!trimmedPassword) return { ok: false, message: "Password is required to delete account." };

      const localBlockingOrders = orders.filter((order) => hasBlockingOrderStatus(order.status));
      if (localBlockingOrders.length > 0) {
        return { ok: false, message: "Account deletion is blocked because you have pending orders." };
      }

      if (isSupabaseConfigured && supabase && authUser.id) {
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
      }

      const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
      const userIndex = users.findIndex((user) => user.email === authUser.email);
      if (userIndex === -1) return { ok: false, message: "Account not found." };
      if (users[userIndex].password !== trimmedPassword) return { ok: false, message: "Password is incorrect." };

      const nextUsers = users.filter((user) => user.email !== authUser.email);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));

      const ordersMap = localOrdersMap();
      delete ordersMap[authUser.email];
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersMap));

      setCartItems([]);
      setWishlistItems([]);
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
    } else {
      const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
      const nextUsers = users.map((user) =>
        user.email === authUser.email
          ? { ...user, address: normalized.address, addressDetails: normalized }
          : user
      );
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
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

  const saveLocalOrder = (orderState) => {
    const ordersMap = localOrdersMap();
    const userOrders = ordersMap[authUser.email] || [];
    const nextOrders = [orderState, ...userOrders];
    ordersMap[authUser.email] = nextOrders;
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersMap));
    setOrders(nextOrders);
  };

  const saveSupabaseOrder = async (orderState) => {
    const { data, error } = await supabase.from("orders").insert({
      user_id: authUser.id,
      order_ref: orderState.id,
      amount: orderState.amount,
      currency: "INR",
      status: orderState.status,
      items: orderState.items,
      shipping: orderState.shipping,
      payment: orderState.payment || {},
    }).select("*").single();

    if (error) throw error;
    const normalized = mapOrderRowToState(data);
    setOrders((prev) => [normalized, ...prev]);
  };

  const finalizePaidOrder = async (paymentInfo = null) => {
    const readiness = validateCheckoutReadiness();
    if (!readiness.ok) return readiness;

    const orderState = buildOrderState(cartItems, cartSubtotal, shippingDetails, paymentInfo, getProductById);

    try {
      if (isSupabaseConfigured && supabase && authUser?.id) {
        await saveSupabaseOrder(orderState);
      } else {
        saveLocalOrder(orderState);
      }

      setCartItems([]);
      await updateProfileAddressDetails(shippingDetails);
      setCartMessage("Order placed successfully. We will contact you soon.");
      return { requiresAuth: false, ok: true };
    } catch (error) {
      setCartMessage(error.message || "Order could not be saved.");
      return { requiresAuth: false, ok: false };
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

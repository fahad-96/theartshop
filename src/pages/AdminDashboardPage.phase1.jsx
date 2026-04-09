import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { mapProductRowToProduct, products as hardcodedProducts, slugifyProductTitle } from "../data/products";
import { supabase } from "../lib/supabaseClient";
import {
  banCustomer,
  bulkSetProductsActive,
  deleteAdminCoupon,
  deleteAdminProduct,
  deleteCustomer,
  deleteReview,
  fetchAdminCoupons,
  fetchAdminCustomers,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReviews,
  fetchCustomerOrders,
  isAdminUser,
  saveAdminCoupon,
  saveAdminProduct,
  seedHardcodedProducts,
  unbanCustomer,
  updateAdminOrderStatus,
  updateReviewStatus,
  uploadProductImage,
} from "../lib/adminApi";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "products", label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { id: "orders", label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "reviews", label: "Reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { id: "customers", label: "Customers", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: "coupons", label: "Coupons", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const EMPTY_FORM = {
  id: "",
  title: "",
  slug: "",
  imageUrl: "",
  imagePath: "",
  imageFiles: [],
  imageGallery: [],
  category: "Art",
  info: "",
  shortInfo: "",
  priceS: 599,
  priceL: 999,
  priceXL: 1499,
  sortOrder: 0,
  isActive: true,
  publishStatus: "published",
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { refreshProducts } = useShop();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [adminUserEmail, setAdminUserEmail] = useState("");

  const [activeSection, setActiveSection] = useState("dashboard");

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_FORM);

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [orderDrafts, setOrderDrafts] = useState({});
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);

  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [reviewProductFilter, setReviewProductFilter] = useState("all");
  const [draftPreviewUrl, setDraftPreviewUrl] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: "", discount_type: "percentage", discount_value: 10, minimum_purchase: 0, max_uses: 0, active: true, valid_from: "", valid_until: "" });
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [productsSubTab, setProductsSubTab] = useState("catalog");
  const notifRef = useRef(null);

  const NOTIF_LS_KEY = "admin_orders_last_seen";

  const newOrders = useMemo(() => {
    const lastSeen = localStorage.getItem(NOTIF_LS_KEY);
    if (!lastSeen) return orders;
    return orders.filter((o) => new Date(o.created_at) > new Date(lastSeen));
  }, [orders]);

  const markOrdersSeen = useCallback(() => {
    if (orders.length) {
      const latest = orders.reduce((max, o) => {
        const t = new Date(o.created_at).getTime();
        return t > max ? t : max;
      }, 0);
      localStorage.setItem(NOTIF_LS_KEY, new Date(latest).toISOString());
    }
  }, [orders]);

  useEffect(() => {
    if (activeSection === "orders") markOrdersSeen();
  }, [activeSection, markOrdersSeen]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!productForm.imageFiles?.length) {
      setDraftPreviewUrl("");
      return undefined;
    }

    const previewFile = productForm.imageFiles[0];
    const objectUrl = URL.createObjectURL(previewFile);
    setDraftPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [productForm.imageFiles]);

  const stats = useMemo(() => {
    const nonCancelledOrders = orders.filter((row) => String(row.status).toLowerCase() !== "cancelled");
    const totalSales = nonCancelledOrders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const paidOrders = orders.filter((row) => String(row.status).toLowerCase() === "paid").length;
    const deliveredOrders = orders.filter((row) => String(row.status).toLowerCase() === "delivered").length;
    const pendingOrders = orders.filter((row) => ["placed", "processing", "pending"].includes(String(row.status).toLowerCase())).length;
    const cancelledOrders = orders.filter((row) => String(row.status).toLowerCase() === "cancelled").length;
    const activeProducts = products.filter((row) => row.isActive !== false && row.publishStatus === "published").length;
    return { totalSales, totalOrders: orders.length, paidOrders, deliveredOrders, pendingOrders, cancelledOrders, activeProducts };
  }, [orders, products]);

  const syncAdmin = async (opts = {}) => {
    if (!supabase) {
      navigate("/admin/login", { replace: true });
      return;
    }

    const admin = await isAdminUser(supabase);
    if (!admin) {
      await supabase.auth.signOut();
      navigate("/admin/login", { replace: true });
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    setAdminUserEmail(sessionData.session?.user?.email || "");

    const [orderRows, productRows, reviewRows, customerRows, couponRows] = await Promise.all([
      fetchAdminOrders(supabase, opts.orderFilters || {}),
      fetchAdminProducts(supabase, opts.productFilters || {}),
      fetchAdminReviews(supabase, opts.reviewFilters || {}),
      fetchAdminCustomers(supabase, {}).catch(() => []),
      fetchAdminCoupons(supabase).catch(() => []),
    ]);

    setOrders(orderRows.map((row) => ({ ...row, dbId: row.id })));
    setProducts(productRows.map(mapProductRowToProduct));
    setReviews(reviewRows || []);
    setCustomers(customerRows || []);
    setCoupons(couponRows || []);
    setLoading(false);
  };

  useEffect(() => {
    syncAdmin().catch((error) => {
      setMessage(error.message || "Admin dashboard could not load.");
      setMessageType("error");
      setLoading(false);
      navigate("/admin/login", { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFlash = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const refreshOrders = async () => {
    const rows = await fetchAdminOrders(supabase, {
      status: orderStatusFilter,
      search: orderSearch,
      dateFrom: orderDateFrom,
      dateTo: orderDateTo,
    });
    setOrders(rows.map((row) => ({ ...row, dbId: row.id })));
  };

  const refreshProductsList = async () => {
    const rows = await fetchAdminProducts(supabase, {
      search: productSearch,
      status: productStatusFilter,
    });
    setProducts(rows.map(mapProductRowToProduct));
  };

  const refreshReviews = async () => {
    const rows = await fetchAdminReviews(supabase, {
      status: reviewStatusFilter,
      productId: reviewProductFilter,
    });
    setReviews(rows || []);
  };

  const onUploadImages = async () => {
    if (!productForm.imageFiles?.length) return [];

    const uploaded = [];
    for (const file of productForm.imageFiles) {
      const seedId = productForm.id || `draft-${Date.now()}`;
      const url = await uploadProductImage(supabase, file, seedId);
      uploaded.push(url);
    }
    return uploaded;
  };

  const resetProductForm = () => {
    setProductForm(EMPTY_FORM);
  };

  const onSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.title.trim()) {
      setFlash("Product title is required.", "error");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const uploadedUrls = await onUploadImages();
      const mergedGallery = [
        ...new Set([
          ...uploadedUrls,
          ...(Array.isArray(productForm.imageGallery) ? productForm.imageGallery : []),
          productForm.imageUrl.trim(),
        ].filter(Boolean)),
      ];

      const primaryImage = mergedGallery[0] || productForm.imageUrl.trim() || productForm.imagePath.trim();
      const payload = {
        id: productForm.id || undefined,
        slug: productForm.slug || slugifyProductTitle(productForm.title),
        title: productForm.title,
        image_path: productForm.imagePath,
        image_url: primaryImage,
        image_gallery: mergedGallery,
        category: productForm.category,
        info: productForm.info,
        short_info: productForm.shortInfo,
        pricing: {
          S: Number(productForm.priceS) || 599,
          L: Number(productForm.priceL) || 999,
          XL: Number(productForm.priceXL) || 1499,
        },
        sort_order: Number(productForm.sortOrder) || 0,
        is_active: Boolean(productForm.isActive),
        publish_status: productForm.publishStatus || "draft",
      };

      await saveAdminProduct(supabase, payload);
      await refreshProducts();
      await refreshProductsList();
      resetProductForm();
      setSelectedProductIds([]);
      setFlash("Product saved.", "success");
    } catch (error) {
      setFlash(error.message || "Could not save product.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onEditProduct = (product) => {
    setProductForm({
      id: product.dbId || "",
      title: product.title || "",
      slug: product.slug || "",
      imageUrl: product.image_url || "",
      imagePath: product.imagePath || "",
      imageFiles: [],
      imageGallery: Array.isArray(product.imageGallery) ? product.imageGallery : [],
      category: product.category || "Art",
      info: product.info || "",
      shortInfo: product.shortInfo || "",
      priceS: product.pricing?.S ?? 599,
      priceL: product.pricing?.L ?? 999,
      priceXL: product.pricing?.XL ?? 1499,
      sortOrder: product.sortOrder ?? 0,
      isActive: product.isActive !== false,
      publishStatus: product.publishStatus || "published",
    });
  };

  const onDeleteProduct = async (productId) => {
    if (!window.confirm("Delete this product permanently?")) return;
    setSaving(true);
    try {
      await deleteAdminProduct(supabase, productId);
      await refreshProducts();
      await refreshProductsList();
      setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
      setFlash("Product deleted.", "success");
    } catch (error) {
      setFlash(error.message || "Could not delete product.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onBulkSetActive = async (isActive) => {
    if (!selectedProductIds.length) return;
    setSaving(true);
    try {
      await bulkSetProductsActive(supabase, selectedProductIds, isActive);
      await refreshProducts();
      await refreshProductsList();
      setSelectedProductIds([]);
      setFlash(`Selected products ${isActive ? "activated" : "deactivated"}.`, "success");
    } catch (error) {
      setFlash(error.message || "Bulk action failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onPreviewProduct = async () => {
    if (!productForm.title.trim()) {
      setFlash("Give the product a title before preview.", "error");
      return;
    }
    setFlash("Preview updated locally. Save the product to upload and publish it.", "info");
  };

  const onUpdateOrderStatus = async (orderId) => {
    const status = orderDrafts[orderId];
    if (!status) return;
    setUpdatingOrderId(orderId);
    try {
      // Capture order data BEFORE refresh (state won't update in this closure)
      const order = orders.find((o) => o.dbId === orderId);
      let email = order?.shipping?.email || "";
      const customerName = order?.shipping?.fullName || "";
      const orderRef = order?.order_ref || orderId;
      const amount = order?.amount;
      const items = order?.items;

      // Fallback: look up email from profiles via the order's user_id
      if (!email && order?.user_id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", order.user_id)
            .maybeSingle();
          email = profile?.email || "";
        } catch {}
      }

      await updateAdminOrderStatus(supabase, orderId, status);
      await refreshOrders();

      // Send email notification to customer
      if (email) {
        try {
          const notifyUrl = (import.meta.env.VITE_API_BASE_URL || "") + "/api/notify/order-status";
          const res = await fetch(notifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderRef, status, email, customerName, amount, items }),
          });
          const result = await res.json().catch(() => null);
          if (res.ok && result?.ok) {
            setFlash(`Status updated to "${status}" & email sent to ${email}.`, "success");
          } else {
            setFlash(`Status updated but email failed: ${result?.message || "unknown error"}.`, "error");
          }
        } catch (emailErr) {
          setFlash(`Status updated but email failed: ${emailErr.message || "network error"}.`, "error");
        }
      } else {
        setFlash(`Status updated to "${status}". No customer email on file.`, "success");
      }
    } catch (error) {
      setFlash(error.message || "Could not update order status.", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const onSeedProducts = async () => {
    if (!window.confirm(`This will import ${hardcodedProducts.length} default products into the database. Products with matching slugs will be skipped. Continue?`)) return;
    setSaving(true);
    try {
      const count = await seedHardcodedProducts(supabase, hardcodedProducts);
      await refreshProducts();
      await refreshProductsList();
      setFlash(`Seeded ${count} new products. (${hardcodedProducts.length - count} already existed)`, "success");
    } catch (error) {
      setFlash(error.message || "Could not seed products.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onSetReviewStatus = async (reviewId, reviewStatus) => {
    setSaving(true);
    try {
      await updateReviewStatus(supabase, reviewId, reviewStatus);
      await refreshReviews();
      setFlash(`Review ${reviewStatus}.`, "success");
    } catch (error) {
      setFlash(error.message || "Could not update review.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review?")) return;
    setSaving(true);
    try {
      await deleteReview(supabase, reviewId);
      await refreshReviews();
      setFlash("Review deleted.", "success");
    } catch (error) {
      setFlash(error.message || "Could not delete review.", "error");
    } finally {
      setSaving(false);
    }
  };

  const productsById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.dbId, p));
    return map;
  }, [products]);

  // ── Customer Handlers ──
  const refreshCustomers = async () => {
    const rows = await fetchAdminCustomers(supabase, { search: customerSearch });
    setCustomers(rows || []);
  };

  const onViewCustomer = async (customer) => {
    setActiveCustomer(customer);
    setCustomerLoading(true);
    try {
      const orders = await fetchCustomerOrders(supabase, customer.user_id);
      setCustomerOrders(orders || []);
    } catch {
      setCustomerOrders([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  const onBanCustomer = async (userId) => {
    if (!window.confirm("Ban this customer? They will not be able to place orders.")) return;
    setSaving(true);
    try {
      await banCustomer(supabase, userId);
      await refreshCustomers();
      if (activeCustomer?.user_id === userId) setActiveCustomer((c) => c ? { ...c, is_banned: true } : c);
      setFlash("Customer banned.", "success");
    } catch (error) {
      setFlash(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const onUnbanCustomer = async (userId) => {
    setSaving(true);
    try {
      await unbanCustomer(supabase, userId);
      await refreshCustomers();
      if (activeCustomer?.user_id === userId) setActiveCustomer((c) => c ? { ...c, is_banned: false } : c);
      setFlash("Customer unbanned.", "success");
    } catch (error) {
      setFlash(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteCustomer = async (userId) => {
    if (!window.confirm("DELETE this customer permanently? All their data (orders, reviews, profile) will be removed. This cannot be undone.")) return;
    setSaving(true);
    try {
      await deleteCustomer(supabase, userId);
      await refreshCustomers();
      if (activeCustomer?.user_id === userId) { setActiveCustomer(null); setCustomerOrders([]); }
      setFlash("Customer deleted.", "success");
    } catch (error) {
      setFlash(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Coupon Handlers ──
  const refreshCoupons = async () => {
    try {
      const rows = await fetchAdminCoupons(supabase);
      setCoupons(rows || []);
    } catch { setCoupons([]); }
  };

  const resetCouponForm = () => {
    setCouponForm({ code: "", discount_type: "percentage", discount_value: 10, minimum_purchase: 0, max_uses: 0, active: true, valid_from: "", valid_until: "" });
    setEditingCouponId(null);
  };

  const onSaveCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code.trim()) { setFlash("Coupon code is required.", "error"); return; }
    if (!couponForm.valid_from || !couponForm.valid_until) { setFlash("Valid from and valid until dates are required.", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        ...couponForm,
        code: couponForm.code.trim().toUpperCase(),
        valid_from: new Date(couponForm.valid_from).toISOString(),
        valid_until: new Date(couponForm.valid_until).toISOString(),
      };
      if (editingCouponId) payload.id = editingCouponId;
      await saveAdminCoupon(supabase, payload);
      await refreshCoupons();
      resetCouponForm();
      setFlash("Coupon saved.", "success");
    } catch (error) {
      setFlash(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const onEditCoupon = (coupon) => {
    setCouponForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_purchase: coupon.minimum_purchase || 0,
      max_uses: coupon.max_uses || 0,
      active: coupon.active,
      valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : "",
      valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : "",
    });
    setEditingCouponId(coupon.id);
  };

  const onDeleteCoupon = async (couponId) => {
    if (!window.confirm("Delete this coupon?")) return;
    setSaving(true);
    try {
      await deleteAdminCoupon(supabase, couponId);
      await refreshCoupons();
      setFlash("Coupon deleted.", "success");
    } catch (error) {
      setFlash(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/50 tracking-wider uppercase">Loading admin...</p>
        </div>
      </div>
    );
  }

  const NavIcon = ({ d }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={d} /></svg>
  );

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-[#09090b] border-r border-white/[0.06]">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black font-black text-sm">TA</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">The Art Shop</h1>
            <p className="text-[10px] text-white/40 truncate max-w-[150px]">{adminUserEmail}</p>
          </div>
        </div>
      </div>

      <div className="px-3 mb-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-semibold px-3 mb-2">Menu</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => { setActiveSection(section.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              activeSection === section.id
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
            }`}
          >
            <NavIcon d={section.icon} />
            {section.label}
            {section.id === "orders" && stats.pendingOrders > 0 && (
              <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">{stats.pendingOrders}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 mt-auto space-y-1 border-t border-white/[0.06]">
        <button type="button" onClick={() => navigate("/")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all">
          <NavIcon d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          Open Storefront
        </button>
        <button
          type="button"
          onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login", { replace: true }); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/[0.06] transition-all"
        >
          <NavIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          Logout
        </button>
      </div>
    </aside>
  );

  const NotificationBell = () => (
    <div className="relative" ref={notifRef}>
      <button
        type="button"
        onClick={() => { setNotifOpen((v) => !v); }}
        className="relative text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
        {newOrders.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-1">{newOrders.length > 99 ? "99+" : newOrders.length}</span>
        )}
      </button>
      {notifOpen && (
        <div className="absolute right-0 top-10 w-80 max-h-96 bg-[#111113] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold">New Orders</h3>
            {newOrders.length > 0 && (
              <button type="button" onClick={() => { markOrdersSeen(); setNotifOpen(false); }} className="text-[10px] text-white/40 hover:text-white/70 transition-colors">Mark all read</button>
            )}
          </div>
          <div className="overflow-y-auto max-h-72">
            {newOrders.length === 0 ? (
              <p className="text-center text-white/30 text-sm py-8">No new orders</p>
            ) : (
              newOrders.slice(0, 20).map((o) => (
                <button
                  key={o.dbId}
                  type="button"
                  onClick={() => { setActiveSection("orders"); setActiveOrder(o); markOrdersSeen(); setNotifOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{o.order_ref || o.dbId?.slice(0, 8)}</span>
                    <span className="text-xs font-semibold text-emerald-400">₹{o.amount}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-white/50">{o.shipping?.fullName || "Guest"}</span>
                    <span className="text-[10px] text-white/30">{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
          {newOrders.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.06]">
              <button type="button" onClick={() => { setActiveSection("orders"); markOrdersSeen(); setNotifOpen(false); }} className="w-full text-center text-xs text-white/50 hover:text-white/80 transition-colors">View all orders →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#09090b] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <span className="text-black font-black text-[10px]">TA</span>
          </div>
          <span className="text-sm font-bold">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/70 p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px]"><Sidebar /></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-0 h-screen overflow-y-auto"><Sidebar /></div>

        <main className="p-4 md:p-6 lg:p-8 overflow-x-hidden">
          {/* Desktop notification bell */}
          <div className="hidden lg:flex justify-end mb-2">
            <NotificationBell />
          </div>
          {/* Flash message */}
          {message && (
            <div className={`mb-5 flex items-center justify-between gap-3 border px-4 py-3 rounded-lg text-sm ${
              messageType === "success" ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
              : messageType === "info" ? "border-sky-500/20 bg-sky-500/[0.06] text-sky-300"
              : "border-rose-500/20 bg-rose-500/[0.06] text-rose-300"
            }`}>
              <span>{message}</span>
              <button type="button" onClick={() => setMessage("")} className="text-white/40 hover:text-white/70 shrink-0">✕</button>
            </div>
          )}

          {/* ═══════════ DASHBOARD ═══════════ */}
          {activeSection === "dashboard" && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                <p className="mt-1 text-sm text-white/45">Business overview at a glance.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: "Revenue", value: `₹${stats.totalSales.toFixed(0)}`, color: "emerald" },
                  { label: "Total Orders", value: stats.totalOrders, color: "sky" },
                  { label: "Delivered", value: stats.deliveredOrders, color: "violet" },
                  { label: "Pending", value: stats.pendingOrders, color: "amber" },
                  { label: "Cancelled", value: stats.cancelledOrders, color: "rose" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                    <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{s.label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Recent Orders</h3>
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.dbId} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div>
                        <p className="text-sm font-medium">{o.order_ref || o.dbId?.slice(0, 8)}</p>
                        <p className="text-[11px] text-white/40">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">₹{o.amount}</p>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  ))}
                  {!orders.length && <p className="text-sm text-white/40">No orders yet.</p>}
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Top Products</h3>
                  {products.slice(0, 5).map((p) => (
                    <div key={p.dbId} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                      <img src={p.src} alt={p.title} className="w-9 h-9 rounded-md object-cover border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-[11px] text-white/40">₹{p.pricing?.S} / ₹{p.pricing?.L} / ₹{p.pricing?.XL}</p>
                      </div>
                      <StatusBadge status={p.publishStatus} />
                    </div>
                  ))}
                  {!products.length && <p className="text-sm text-white/40">No products yet.</p>}
                </div>
              </div>
            </section>
          )}

          {/* ═══════════ PRODUCTS ═══════════ */}
          {activeSection === "products" && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Products</h2>
                <p className="mt-1 text-sm text-white/45">Manage your catalog, draft/publish workflow.</p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2 mb-5">
                <button type="button" onClick={() => setProductsSubTab("catalog")} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${productsSubTab === "catalog" ? "bg-white text-black" : "border border-white/10 text-white/60 hover:bg-white/[0.04]"}`}>Catalog</button>
                <button type="button" onClick={() => setProductsSubTab("add")} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${productsSubTab === "add" ? "bg-white text-black" : "border border-white/10 text-white/60 hover:bg-white/[0.04]"}`}>{productForm.id ? "Edit Product" : "Add Product"}</button>
                <button type="button" onClick={onSeedProducts} disabled={saving} className="ml-auto px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold border border-amber-500/20 text-amber-400 hover:bg-amber-500/[0.06] disabled:opacity-30 transition-colors">Import Default Products</button>
              </div>

              {/* Catalog sub-tab */}
              {productsSubTab === "catalog" && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">Catalog ({products.length})</h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => onBulkSetActive(true)} disabled={!selectedProductIds.length || saving} className="text-xs px-3 py-1.5 rounded-md border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/[0.06] disabled:opacity-30 transition-colors">Activate</button>
                      <button type="button" onClick={() => onBulkSetActive(false)} disabled={!selectedProductIds.length || saving} className="text-xs px-3 py-1.5 rounded-md border border-amber-500/20 text-amber-400 hover:bg-amber-500/[0.06] disabled:opacity-30 transition-colors">Deactivate</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 mb-4">
                    <AdminInput value={productSearch} onChange={setProductSearch} placeholder="Search products..." />
                    <AdminSelect value={productStatusFilter} onChange={setProductStatusFilter} options={[["all","All status"],["draft","Draft"],["published","Published"],["active","Active"],["inactive","Inactive"]]} />
                    <button type="button" onClick={refreshProductsList} className="border border-white/10 px-4 py-2 rounded-lg text-xs uppercase tracking-wider text-white/60 hover:bg-white/[0.04]">Filter</button>
                  </div>

                  <div className="overflow-auto rounded-lg border border-white/[0.06]">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/35">
                        <th className="p-3 text-left w-10"><input type="checkbox" className="accent-white" onChange={(e) => setSelectedProductIds(e.target.checked ? products.map((p) => p.dbId) : [])} checked={selectedProductIds.length === products.length && products.length > 0} /></th>
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr></thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.dbId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="p-3"><input type="checkbox" className="accent-white" checked={selectedProductIds.includes(p.dbId)} onChange={(e) => setSelectedProductIds((prev) => e.target.checked ? [...prev, p.dbId] : prev.filter((id) => id !== p.dbId))} /></td>
                            <td className="p-3">
                              <div className="flex gap-3 items-center">
                                <img src={p.src} alt={p.title} className="h-10 w-10 rounded-md object-cover border border-white/[0.06]" />
                                <div>
                                  <p className="font-medium text-sm">{p.title}</p>
                                  <p className="text-[11px] text-white/35 mt-0.5">₹{p.pricing?.S} · ₹{p.pricing?.L} · ₹{p.pricing?.XL}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3"><StatusBadge status={p.publishStatus} /> <span className={`ml-1 text-[10px] ${p.isActive ? "text-emerald-400" : "text-white/30"}`}>{p.isActive ? "●" : "○"}</span></td>
                            <td className="p-3">
                              <div className="flex gap-1.5">
                                <SmallBtn onClick={() => { onEditProduct(p); setProductsSubTab("add"); }}>Edit</SmallBtn>
                                <SmallBtn onClick={() => saveAdminProduct(supabase, { id: p.dbId, publish_status: p.publishStatus === "published" ? "draft" : "published" }).then(refreshProductsList)} color="sky">{p.publishStatus === "published" ? "Unpublish" : "Publish"}</SmallBtn>
                                <SmallBtn onClick={() => onDeleteProduct(p.dbId)} color="rose">Delete</SmallBtn>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!products.length && <tr><td colSpan={4} className="p-8 text-center text-white/30">No products. Click "Import Default Products" to load the default catalog.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Add/Edit Product sub-tab */}
              {productsSubTab === "add" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                    <h3 className="text-base font-semibold">{productForm.id ? "Edit Product" : "New Product"}</h3>
                    <form onSubmit={onSaveProduct} className="mt-4 space-y-3">
                      <AdminInput value={productForm.title} onChange={(v) => setProductForm((p) => ({ ...p, title: v }))} placeholder="Product title" />
                      <AdminInput value={productForm.slug} onChange={(v) => setProductForm((p) => ({ ...p, slug: v }))} placeholder="Slug (auto-generated)" />
                      <AdminInput value={productForm.imageUrl} onChange={(v) => setProductForm((p) => ({ ...p, imageUrl: v }))} placeholder="Primary image URL" />
                      <AdminInput value={productForm.imagePath} onChange={(v) => setProductForm((p) => ({ ...p, imagePath: v }))} placeholder="Or storage path" />
                      <input type="file" accept="image/*" multiple onChange={(e) => setProductForm((p) => ({ ...p, imageFiles: Array.from(e.target.files || []) }))} className="w-full text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-white/10 file:text-white/70 file:bg-white/[0.04] file:text-xs file:uppercase file:tracking-wider file:cursor-pointer" />

                      <div className="grid grid-cols-3 gap-2">
                        <AdminInput type="number" value={productForm.priceS} onChange={(v) => setProductForm((p) => ({ ...p, priceS: v }))} placeholder="S ₹" />
                        <AdminInput type="number" value={productForm.priceL} onChange={(v) => setProductForm((p) => ({ ...p, priceL: v }))} placeholder="L ₹" />
                        <AdminInput type="number" value={productForm.priceXL} onChange={(v) => setProductForm((p) => ({ ...p, priceXL: v }))} placeholder="XL ₹" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <AdminSelect value={productForm.publishStatus} onChange={(v) => setProductForm((p) => ({ ...p, publishStatus: v }))} options={[["draft","Draft"],["published","Published"]]} />
                        <AdminSelect value={productForm.isActive ? "active" : "inactive"} onChange={(v) => setProductForm((p) => ({ ...p, isActive: v === "active" }))} options={[["active","Active"],["inactive","Inactive"]]} />
                      </div>

                      <AdminTextarea value={productForm.shortInfo} onChange={(v) => setProductForm((p) => ({ ...p, shortInfo: v }))} placeholder="Short description" rows={2} />
                      <AdminTextarea value={productForm.info} onChange={(v) => setProductForm((p) => ({ ...p, info: v }))} placeholder="Full description" rows={3} />

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button disabled={saving} className="bg-white text-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold hover:bg-white/90 transition-colors disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                        <button type="button" onClick={() => { resetProductForm(); setProductsSubTab("catalog"); }} className="border border-white/10 text-white/60 px-4 py-2 rounded-lg text-xs uppercase tracking-wider hover:bg-white/[0.04]">Cancel</button>
                      </div>
                    </form>
                  </div>

                  {/* Preview */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                    <p className="text-[11px] uppercase tracking-wider text-white/30 font-medium mb-3">Preview</p>
                    <div className="rounded-lg border border-white/[0.06] overflow-hidden bg-black/30">
                      <div className="aspect-[4/3] bg-black/40 flex items-center justify-center">
                        {draftPreviewUrl ? (
                          <img src={draftPreviewUrl} alt="" className="h-full w-full object-cover" />
                        ) : productForm.imageUrl.trim() ? (
                          <img src={productForm.imageUrl.trim()} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <p className="text-sm text-white/30">No image</p>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-sm">{productForm.title || "Untitled"}</p>
                        <p className="text-xs text-white/50 mt-1 line-clamp-2">{productForm.shortInfo || "No description"}</p>
                        <div className="flex gap-3 mt-3 text-xs text-white/40">
                          <span>S: ₹{productForm.priceS}</span>
                          <span>L: ₹{productForm.priceL}</span>
                          <span>XL: ₹{productForm.priceXL}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ═══════════ ORDERS ═══════════ */}
          {activeSection === "orders" && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
                <p className="mt-1 text-sm text-white/45">Track, filter, and update order statuses.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
                <AdminInput value={orderSearch} onChange={setOrderSearch} placeholder="Search order ref..." className="col-span-2 md:col-span-1" />
                <AdminSelect value={orderStatusFilter} onChange={setOrderStatusFilter} options={[["all","All status"],["Placed","Placed"],["Processing","Processing"],["Shipped","Shipped"],["Delivered","Delivered"],["Cancelled","Cancelled"]]} />
                <input type="date" value={orderDateFrom} onChange={(e) => setOrderDateFrom(e.target.value)} className="bg-[#1a1a1c] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/20" />
                <input type="date" value={orderDateTo} onChange={(e) => setOrderDateTo(e.target.value)} className="bg-[#1a1a1c] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/20" />
                <button type="button" onClick={refreshOrders} className="border border-white/10 px-4 py-2 rounded-lg text-xs uppercase tracking-wider text-white/60 hover:bg-white/[0.04]">Filter</button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/35">
                      <th className="p-3 text-left">Order</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Amount</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Action</th>
                    </tr></thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.dbId} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${activeOrder?.dbId === o.dbId ? "bg-white/[0.04]" : ""}`} onClick={() => setActiveOrder(o)}>
                          <td className="p-3">
                            <p className="font-medium">{o.order_ref || o.dbId?.slice(0, 8)}</p>
                            <p className="text-[11px] text-white/35 mt-0.5">{new Date(o.created_at).toLocaleString()}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm text-white/80 truncate max-w-[140px]">{o.shipping?.fullName || "—"}</p>
                            <p className="text-[10px] text-white/30 mt-0.5 truncate max-w-[140px]">{o.shipping?.phone || ""}</p>
                          </td>
                          <td className="p-3 font-semibold">₹{o.amount}</td>
                          <td className="p-3"><StatusBadge status={o.status} /></td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <select value={orderDrafts[o.dbId] || o.status} onChange={(e) => setOrderDrafts((prev) => ({ ...prev, [o.dbId]: e.target.value }))} disabled={updatingOrderId === o.dbId} className="bg-[#1a1a1c] border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white outline-none disabled:opacity-40" style={{ colorScheme: 'dark' }}>
                                {["Placed","Processing","Shipped","Delivered","Cancelled"].map((s) => <option key={s} style={{ backgroundColor: '#1a1a1c', color: '#fff' }}>{s}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => onUpdateOrderStatus(o.dbId)}
                                disabled={updatingOrderId === o.dbId}
                                className="border border-white/10 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors text-white/60 hover:bg-white/[0.04] disabled:opacity-60 disabled:cursor-wait flex items-center gap-1.5 min-w-[60px] justify-center"
                              >
                                {updatingOrderId === o.dbId ? (
                                  <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Updating…</>
                                ) : "Save"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!orders.length && <tr><td colSpan={4} className="p-8 text-center text-white/30">No orders.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-base font-semibold mb-4">Order Details</h3>
                  {!activeOrder ? (
                    <p className="text-sm text-white/35">Select an order to view details.</p>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[11px] text-white/30 uppercase tracking-wider">Order Ref</p><p className="font-medium mt-0.5">{activeOrder.order_ref || activeOrder.dbId}</p></div>
                        <div><p className="text-[11px] text-white/30 uppercase tracking-wider">Amount</p><p className="font-medium mt-0.5">₹{activeOrder.amount}</p></div>
                        <div><p className="text-[11px] text-white/30 uppercase tracking-wider">Customer</p><p className="font-medium mt-0.5 break-all text-xs">{activeOrder.shipping?.fullName || activeOrder.user_id}</p></div>
                        <div><p className="text-[11px] text-white/30 uppercase tracking-wider">Address</p><p className="font-medium mt-0.5 text-xs">{activeOrder.shipping?.address || "N/A"}</p></div>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Timeline</p>
                        <div className="flex gap-1">
                          {["Placed","Processing","Shipped","Delivered"].map((s, i) => {
                            const statusOrder = ["placed","processing","shipped","delivered"];
                            const currentIdx = statusOrder.indexOf(String(activeOrder.status).toLowerCase());
                            const isActive = i <= currentIdx;
                            return (
                              <div key={s} className="flex-1">
                                <div className={`h-1 rounded-full ${isActive ? "bg-emerald-400" : "bg-white/10"}`} />
                                <p className={`text-[10px] mt-1.5 uppercase tracking-wider ${isActive ? "text-emerald-300" : "text-white/25"}`}>{s}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Items</p>
                        {(Array.isArray(activeOrder.items) ? activeOrder.items : []).map((it, idx) => (
                          <div key={idx} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                            <span className="text-white/80">{it.title}</span>
                            <span className="text-white/50">{it.size} × {it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ═══════════ REVIEWS ═══════════ */}
          {activeSection === "reviews" && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Reviews</h2>
                <p className="mt-1 text-sm text-white/45">Moderate customer reviews.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[180px_220px_auto] gap-2 mb-5">
                <AdminSelect value={reviewStatusFilter} onChange={setReviewStatusFilter} options={[["all","All status"],["pending","Pending"],["approved","Approved"],["rejected","Rejected"]]} />
                <AdminSelect value={reviewProductFilter} onChange={setReviewProductFilter} options={[["all","All products"], ...products.map((p) => [p.dbId, p.title])]} />
                <button type="button" onClick={refreshReviews} className="border border-white/10 px-4 py-2 rounded-lg text-xs uppercase tracking-wider text-white/60 hover:bg-white/[0.04] justify-self-start">Filter</button>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/35">
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-left">Rating</th>
                    <th className="p-3 text-left">Review</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr></thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors align-top">
                        <td className="p-3 text-white/70">{r.products?.title || "—"}</td>
                        <td className="p-3"><span className="text-amber-400">{"★".repeat(r.rating)}</span><span className="text-white/15">{"★".repeat(5 - r.rating)}</span></td>
                        <td className="p-3 max-w-[300px]">
                          <p className="font-medium">{r.title}</p>
                          <p className="text-white/50 mt-0.5 line-clamp-2 text-xs">{r.review_text}</p>
                        </td>
                        <td className="p-3"><StatusBadge status={r.review_status || "pending"} /></td>
                        <td className="p-3">
                          <div className="flex gap-1.5">
                            <SmallBtn onClick={() => onSetReviewStatus(r.id, "approved")} color="emerald">Approve</SmallBtn>
                            <SmallBtn onClick={() => onSetReviewStatus(r.id, "rejected")} color="amber">Reject</SmallBtn>
                            <SmallBtn onClick={() => onDeleteReview(r.id)} color="rose">Delete</SmallBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!reviews.length && <tr><td colSpan={5} className="p-8 text-center text-white/30">No reviews.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═══════════ CUSTOMERS ═══════════ */}
          {activeSection === "customers" && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
                <p className="mt-1 text-sm text-white/45">View, ban, or remove customer accounts.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mb-5">
                <AdminInput value={customerSearch} onChange={setCustomerSearch} placeholder="Search by name, email, or phone..." />
                <button type="button" onClick={refreshCustomers} className="border border-white/10 px-4 py-2 rounded-lg text-xs uppercase tracking-wider text-white/60 hover:bg-white/[0.04]">Search</button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-5">
                {/* Customer list */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/35">
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Phone</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr></thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr
                          key={c.user_id}
                          className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${activeCustomer?.user_id === c.user_id ? "bg-white/[0.04]" : ""}`}
                          onClick={() => onViewCustomer(c)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-white/60">
                                {(c.full_name || c.email || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{c.full_name || "—"}</p>
                                <p className="text-[11px] text-white/35">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-white/60 text-xs">{c.phone || "—"}</td>
                          <td className="p-3">
                            {c.is_banned ? (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-rose-500/15 text-rose-400 font-semibold uppercase tracking-wider">Banned</span>
                            ) : (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold uppercase tracking-wider">Active</span>
                            )}
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1.5">
                              {c.is_banned ? (
                                <SmallBtn onClick={() => onUnbanCustomer(c.user_id)} color="emerald">Unban</SmallBtn>
                              ) : (
                                <SmallBtn onClick={() => onBanCustomer(c.user_id)} color="amber">Ban</SmallBtn>
                              )}
                              <SmallBtn onClick={() => onDeleteCustomer(c.user_id)} color="rose">Delete</SmallBtn>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!customers.length && <tr><td colSpan={4} className="p-8 text-center text-white/30">No customers found.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* Customer detail panel */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-base font-semibold mb-4">Customer Details</h3>
                  {!activeCustomer ? (
                    <p className="text-sm text-white/35">Select a customer to view profile.</p>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center text-lg font-bold text-white/60">
                          {(activeCustomer.full_name || activeCustomer.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{activeCustomer.full_name || "—"}</p>
                          <p className="text-xs text-white/40">{activeCustomer.email}</p>
                          {activeCustomer.is_banned && <span className="text-[10px] text-rose-400 font-semibold uppercase">Banned</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-[11px] text-white/30 uppercase tracking-wider">Phone</p><p className="mt-0.5">{activeCustomer.phone || "—"}</p></div>
                        <div><p className="text-[11px] text-white/30 uppercase tracking-wider">Joined</p><p className="mt-0.5">{new Date(activeCustomer.created_at).toLocaleDateString()}</p></div>
                        <div className="col-span-2"><p className="text-[11px] text-white/30 uppercase tracking-wider">Address</p><p className="mt-0.5 text-xs text-white/70">{activeCustomer.address || "—"}</p></div>
                        {activeCustomer.landmark && <div className="col-span-2"><p className="text-[11px] text-white/30 uppercase tracking-wider">Landmark</p><p className="mt-0.5 text-xs text-white/70">{activeCustomer.landmark}</p></div>}
                      </div>

                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3">Order History ({customerOrders.length})</p>
                        {customerLoading ? (
                          <p className="text-xs text-white/40">Loading orders...</p>
                        ) : customerOrders.length > 0 ? (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {customerOrders.map((o) => (
                              <div key={o.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                                <div>
                                  <p className="text-xs font-medium">{o.order_ref || o.id.slice(0, 8)}</p>
                                  <p className="text-[10px] text-white/35 mt-0.5">{new Date(o.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold">₹{o.amount}</p>
                                  <StatusBadge status={o.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/35">No orders placed.</p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                        {activeCustomer.is_banned ? (
                          <button type="button" onClick={() => onUnbanCustomer(activeCustomer.user_id)} disabled={saving} className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">Unban</button>
                        ) : (
                          <button type="button" onClick={() => onBanCustomer(activeCustomer.user_id)} disabled={saving} className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold hover:bg-amber-500/20 disabled:opacity-50 transition-colors">Ban Account</button>
                        )}
                        <button type="button" onClick={() => onDeleteCustomer(activeCustomer.user_id)} disabled={saving} className="flex-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold hover:bg-rose-500/20 disabled:opacity-50 transition-colors">Delete Account</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ═══════════ COUPONS ═══════════ */}
          {activeSection === "coupons" && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
                <p className="mt-1 text-sm text-white/45">Create and manage discount codes.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-base font-semibold">{editingCouponId ? "Edit Coupon" : "New Coupon"}</h3>
                  <form onSubmit={onSaveCoupon} className="mt-4 space-y-3">
                    <AdminInput value={couponForm.code} onChange={(v) => setCouponForm((p) => ({ ...p, code: v }))} placeholder="Coupon code (e.g. SAVE20)" />
                    <div className="grid grid-cols-2 gap-2">
                      <AdminSelect value={couponForm.discount_type} onChange={(v) => setCouponForm((p) => ({ ...p, discount_type: v }))} options={[["percentage","Percentage"],["fixed","Fixed Amount"]]} />
                      <AdminInput type="number" value={couponForm.discount_value} onChange={(v) => setCouponForm((p) => ({ ...p, discount_value: Number(v) }))} placeholder="Value" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <AdminInput type="number" value={couponForm.minimum_purchase} onChange={(v) => setCouponForm((p) => ({ ...p, minimum_purchase: Number(v) }))} placeholder="Min purchase ₹" />
                      <AdminInput type="number" value={couponForm.max_uses} onChange={(v) => setCouponForm((p) => ({ ...p, max_uses: Number(v) }))} placeholder="Max uses (0=∞)" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Valid From</label>
                        <input type="datetime-local" value={couponForm.valid_from} onChange={(e) => setCouponForm((p) => ({ ...p, valid_from: e.target.value }))} className="w-full bg-[#1a1a1c] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/20" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Valid Until</label>
                        <input type="datetime-local" value={couponForm.valid_until} onChange={(e) => setCouponForm((p) => ({ ...p, valid_until: e.target.value }))} className="w-full bg-[#1a1a1c] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/20" />
                      </div>
                    </div>
                    <AdminSelect value={couponForm.active ? "active" : "inactive"} onChange={(v) => setCouponForm((p) => ({ ...p, active: v === "active" }))} options={[["active","Active"],["inactive","Inactive"]]} />
                    <div className="flex gap-2 pt-1">
                      <button disabled={saving} className="bg-white text-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold hover:bg-white/90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                      <button type="button" onClick={resetCouponForm} className="border border-white/10 text-white/60 px-4 py-2 rounded-lg text-xs uppercase tracking-wider hover:bg-white/[0.04]">Reset</button>
                    </div>
                  </form>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-base font-semibold mb-4">All Coupons ({coupons.length})</h3>
                  <div className="overflow-auto rounded-lg border border-white/[0.06]">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/35">
                        <th className="p-3 text-left">Code</th>
                        <th className="p-3 text-left">Discount</th>
                        <th className="p-3 text-left">Min Purchase</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr></thead>
                      <tbody>
                        {coupons.map((c) => (
                          <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 font-mono font-semibold">{c.code}</td>
                            <td className="p-3">{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                            <td className="p-3 text-white/60">₹{c.minimum_purchase || 0}</td>
                            <td className="p-3"><StatusBadge status={c.active ? "active" : "inactive"} /></td>
                            <td className="p-3">
                              <div className="flex gap-1.5">
                                <SmallBtn onClick={() => onEditCoupon(c)}>Edit</SmallBtn>
                                <SmallBtn onClick={() => onDeleteCoupon(c.id)} color="rose">Delete</SmallBtn>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!coupons.length && <tr><td colSpan={5} className="p-8 text-center text-white/30">No coupons yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════ SETTINGS ═══════════ */}
          {activeSection === "settings" && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="mt-1 text-sm text-white/45">Store configuration.</p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 max-w-xl">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Admin Email</p>
                    <p className="mt-1 text-sm">{adminUserEmail}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Total Products</p>
                    <p className="mt-1 text-sm">{products.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Total Orders</p>
                    <p className="mt-1 text-sm">{orders.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Total Customers</p>
                    <p className="mt-1 text-sm">{customers.length}</p>
                  </div>
                  <div className="pt-4 border-t border-white/[0.06]">
                    <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-2">Quick Actions</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { refreshProducts(); syncAdmin(); setFlash("Data refreshed.", "success"); }} className="border border-white/10 px-4 py-2 rounded-lg text-xs uppercase tracking-wider text-white/60 hover:bg-white/[0.04]">Refresh All Data</button>
                      <button type="button" onClick={() => navigate("/")} className="border border-white/10 px-4 py-2 rounded-lg text-xs uppercase tracking-wider text-white/60 hover:bg-white/[0.04]">View Storefront</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Shared UI Components ──

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const colors = {
    placed: "bg-sky-500/15 text-sky-400",
    processing: "bg-amber-500/15 text-amber-400",
    shipped: "bg-violet-500/15 text-violet-400",
    delivered: "bg-emerald-500/15 text-emerald-400",
    cancelled: "bg-rose-500/15 text-rose-400",
    paid: "bg-emerald-500/15 text-emerald-400",
    published: "bg-emerald-500/15 text-emerald-400",
    draft: "bg-white/10 text-white/50",
    active: "bg-emerald-500/15 text-emerald-400",
    inactive: "bg-white/10 text-white/40",
    pending: "bg-amber-500/15 text-amber-400",
    approved: "bg-emerald-500/15 text-emerald-400",
    rejected: "bg-rose-500/15 text-rose-400",
  };
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${colors[s] || "bg-white/10 text-white/50"}`}>
      {status}
    </span>
  );
}

function SmallBtn({ children, onClick, color = "white", disabled }) {
  const colors = {
    white: "border-white/10 text-white/60 hover:bg-white/[0.04]",
    emerald: "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/[0.06]",
    amber: "border-amber-500/20 text-amber-400 hover:bg-amber-500/[0.06]",
    sky: "border-sky-500/20 text-sky-400 hover:bg-sky-500/[0.06]",
    rose: "border-rose-500/20 text-rose-400 hover:bg-rose-500/[0.06]",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`border px-2 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-30 ${colors[color]}`}>
      {children}
    </button>
  );
}

function AdminInput({ value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors ${className}`}
    />
  );
}

function AdminSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#1a1a1c] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/20 transition-colors"
      style={{ colorScheme: 'dark' }}
    >
      {options.map(([val, label]) => <option key={val} value={val} style={{ backgroundColor: '#1a1a1c', color: '#fff' }}>{label}</option>)}
    </select>
  );
}

function AdminTextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors resize-none"
    />
  );
}

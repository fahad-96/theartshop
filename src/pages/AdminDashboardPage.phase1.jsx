import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { mapProductRowToProduct, slugifyProductTitle } from "../data/products";
import { supabase } from "../lib/supabaseClient";
import {
  bulkSetProductsActive,
  deleteAdminProduct,
  deleteReview,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReviews,
  isAdminUser,
  saveAdminProduct,
  updateAdminOrderStatus,
  updateReviewStatus,
  uploadProductImage,
} from "../lib/adminApi";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "reviews", label: "Reviews" },
  { id: "coupons", label: "Coupons" },
  { id: "customers", label: "Customers" },
  { id: "settings", label: "Settings" },
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
  const [activeOrder, setActiveOrder] = useState(null);

  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [reviewProductFilter, setReviewProductFilter] = useState("all");
  const [draftPreviewUrl, setDraftPreviewUrl] = useState("");

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
    const totalSales = orders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const paidOrders = orders.filter((row) => String(row.status).toLowerCase() === "paid").length;
    const pendingOrders = orders.filter((row) => ["placed", "processing", "pending"].includes(String(row.status).toLowerCase())).length;
    const activeProducts = products.filter((row) => row.isActive !== false && row.publishStatus === "published").length;
    return { totalSales, totalOrders: orders.length, paidOrders, pendingOrders, activeProducts };
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

    const [orderRows, productRows, reviewRows] = await Promise.all([
      fetchAdminOrders(supabase, opts.orderFilters || {}),
      fetchAdminProducts(supabase, opts.productFilters || {}),
      fetchAdminReviews(supabase, opts.reviewFilters || {}),
    ]);

    setOrders(orderRows.map((row) => ({ ...row, dbId: row.id })));
    setProducts(productRows.map(mapProductRowToProduct));
    setReviews(reviewRows || []);
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
    setSaving(true);
    try {
      await updateAdminOrderStatus(supabase, orderId, status);
      await refreshOrders();
      setFlash("Order status updated.", "success");
    } catch (error) {
      setFlash(error.message || "Could not update order status.", "error");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        <p className="text-white/70">Loading admin workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-screen">
        <aside className="border-r border-white/10 bg-[#0b0b0c] p-5 lg:p-6">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Admin Console</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">The Art Shop</h1>
            <p className="mt-2 text-xs text-white/50 break-all">{adminUserEmail}</p>
          </div>

          <nav className="space-y-2">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm tracking-[0.08em] uppercase transition ${
                  activeSection === section.id
                    ? "bg-white text-black font-bold"
                    : "text-white/75 hover:bg-white/10"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full border border-white/20 px-3 py-2 rounded-md text-xs uppercase tracking-[0.16em] text-white/80 hover:bg-white/10"
            >
              Open Storefront
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/admin/login", { replace: true });
              }}
              className="w-full border border-rose-300/35 px-3 py-2 rounded-md text-xs uppercase tracking-[0.16em] text-rose-200 hover:bg-rose-600/10"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="p-5 md:p-8 lg:p-10">
          {message && (
            <div className={`mb-6 border px-4 py-3 rounded-md ${messageType === "success" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : messageType === "info" ? "border-sky-400/40 bg-sky-500/10 text-sky-200" : "border-rose-400/40 bg-rose-500/10 text-rose-200"}`}>
              {message}
            </div>
          )}

          {activeSection === "dashboard" && (
            <section>
              <h2 className="text-3xl font-black">Dashboard</h2>
              <p className="mt-2 text-white/60">Quick health check of your business.</p>
              <div className="mt-6 grid grid-cols-2 xl:grid-cols-5 gap-4">
                <StatCard title="Total Sales" value={`₹${stats.totalSales.toFixed(0)}`} />
                <StatCard title="Total Orders" value={String(stats.totalOrders)} />
                <StatCard title="Paid Orders" value={String(stats.paidOrders)} />
                <StatCard title="Pending Orders" value={String(stats.pendingOrders)} />
                <StatCard title="Published Products" value={String(stats.activeProducts)} />
              </div>
            </section>
          )}

          {activeSection === "products" && (
            <section>
              <h2 className="text-3xl font-black">Products</h2>
              <p className="mt-2 text-white/60">Draft/publish flow, multi-images, filters, and bulk actions.</p>

              <div className="mt-6 grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
                <div className="border border-white/10 bg-[#121214] rounded-xl p-5">
                  <h3 className="text-xl font-bold">{productForm.id ? "Edit Product" : "Add Product"}</h3>
                  <form onSubmit={onSaveProduct} className="mt-4 space-y-3">
                    <input value={productForm.title} onChange={(e) => setProductForm((p) => ({ ...p, title: e.target.value }))} placeholder="Product title" className="w-full bg-black/40 border border-white/20 px-3 py-2 rounded" />
                    <input value={productForm.slug} onChange={(e) => setProductForm((p) => ({ ...p, slug: e.target.value }))} placeholder="Slug (auto-generated)" className="w-full bg-black/40 border border-white/20 px-3 py-2 rounded" />
                    <input value={productForm.imageUrl} onChange={(e) => setProductForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="Primary image URL" className="w-full bg-black/40 border border-white/20 px-3 py-2 rounded" />
                    <input value={productForm.imagePath} onChange={(e) => setProductForm((p) => ({ ...p, imagePath: e.target.value }))} placeholder="Or local path" className="w-full bg-black/40 border border-white/20 px-3 py-2 rounded" />
                    <input type="file" accept="image/*" multiple onChange={(e) => setProductForm((p) => ({ ...p, imageFiles: Array.from(e.target.files || []) }))} className="w-full bg-black/40 border border-white/20 px-3 py-2 rounded" />

                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" value={productForm.priceS} onChange={(e) => setProductForm((p) => ({ ...p, priceS: e.target.value }))} placeholder="S" className="bg-black/40 border border-white/20 px-3 py-2 rounded" />
                      <input type="number" value={productForm.priceL} onChange={(e) => setProductForm((p) => ({ ...p, priceL: e.target.value }))} placeholder="L" className="bg-black/40 border border-white/20 px-3 py-2 rounded" />
                      <input type="number" value={productForm.priceXL} onChange={(e) => setProductForm((p) => ({ ...p, priceXL: e.target.value }))} placeholder="XL" className="bg-black/40 border border-white/20 px-3 py-2 rounded" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select value={productForm.publishStatus} onChange={(e) => setProductForm((p) => ({ ...p, publishStatus: e.target.value }))} className="bg-black/40 border border-white/20 px-3 py-2 rounded">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                      <select value={productForm.isActive ? "active" : "inactive"} onChange={(e) => setProductForm((p) => ({ ...p, isActive: e.target.value === "active" }))} className="bg-black/40 border border-white/20 px-3 py-2 rounded">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <textarea value={productForm.shortInfo} onChange={(e) => setProductForm((p) => ({ ...p, shortInfo: e.target.value }))} placeholder="Short description" className="w-full bg-black/40 border border-white/20 px-3 py-2 rounded min-h-[70px]" />
                    <textarea value={productForm.info} onChange={(e) => setProductForm((p) => ({ ...p, info: e.target.value }))} placeholder="Full description" className="w-full bg-black/40 border border-white/20 px-3 py-2 rounded min-h-[100px]" />

                    <div className="flex flex-wrap gap-2">
                      <button disabled={saving} className="bg-white text-black px-4 py-2 rounded text-xs uppercase tracking-[0.14em] font-bold">{saving ? "Saving..." : "Save"}</button>
                      <button type="button" disabled={saving} onClick={onPreviewProduct} className="border border-sky-300/40 text-sky-200 px-4 py-2 rounded text-xs uppercase tracking-[0.14em]">Preview Draft</button>
                      <button type="button" onClick={resetProductForm} className="border border-white/25 text-white px-4 py-2 rounded text-xs uppercase tracking-[0.14em]">Reset</button>
                    </div>
                  </form>

                  <div className="mt-5 border-t border-white/10 pt-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/50">Local Preview</p>
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                      <div className="aspect-[4/3] bg-black/60 flex items-center justify-center">
                        {draftPreviewUrl ? (
                          <img src={draftPreviewUrl} alt={productForm.title || "Draft preview"} className="h-full w-full object-cover" />
                        ) : productForm.imageUrl.trim() ? (
                          <img src={productForm.imageUrl.trim()} alt={productForm.title || "Draft preview"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-center px-6">
                            <p className="text-white/70 font-medium">No local image selected yet.</p>
                            <p className="mt-1 text-white/45 text-sm">Choose a file to preview it here before saving.</p>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="font-semibold">{productForm.title || "Untitled draft"}</p>
                        <p className="text-sm text-white/65 line-clamp-3">{productForm.shortInfo || productForm.info || "Add product details to preview the content block."}</p>
                        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.12em] text-white/55">
                          <span className="border border-white/15 rounded-full px-2 py-1">{productForm.publishStatus}</span>
                          <span className="border border-white/15 rounded-full px-2 py-1">{productForm.isActive ? "active" : "inactive"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-white/10 bg-[#121214] rounded-xl p-5">
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <h3 className="text-xl font-bold">Product Table</h3>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onBulkSetActive(true)} disabled={!selectedProductIds.length || saving} className="border border-emerald-300/40 text-emerald-200 px-3 py-2 rounded text-xs uppercase tracking-[0.12em] disabled:opacity-50">Bulk Activate</button>
                      <button type="button" onClick={() => onBulkSetActive(false)} disabled={!selectedProductIds.length || saving} className="border border-amber-300/40 text-amber-200 px-3 py-2 rounded text-xs uppercase tracking-[0.12em] disabled:opacity-50">Bulk Deactivate</button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
                    <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search title/slug/category" className="bg-black/40 border border-white/20 px-3 py-2 rounded" />
                    <select value={productStatusFilter} onChange={(e) => setProductStatusFilter(e.target.value)} className="bg-black/40 border border-white/20 px-3 py-2 rounded">
                      <option value="all">All statuses</option>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button type="button" onClick={refreshProductsList} className="border border-white/25 px-4 py-2 rounded text-xs uppercase tracking-[0.14em]">Apply</button>
                  </div>

                  <div className="mt-4 overflow-auto border border-white/10 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-white/70 uppercase tracking-[0.12em] text-xs">
                        <tr>
                          <th className="p-3 text-left">Select</th>
                          <th className="p-3 text-left">Product</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.dbId} className="border-t border-white/10">
                            <td className="p-3 align-top">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(p.dbId)}
                                onChange={(e) => {
                                  setSelectedProductIds((prev) =>
                                    e.target.checked ? [...prev, p.dbId] : prev.filter((id) => id !== p.dbId)
                                  );
                                }}
                              />
                            </td>
                            <td className="p-3 align-top">
                              <div className="flex gap-3 items-start">
                                <img src={p.src} alt={p.title} className="h-14 w-14 object-cover rounded border border-white/10" />
                                <div>
                                  <p className="font-semibold">{p.title}</p>
                                  <p className="text-white/60 text-xs">{p.slug}</p>
                                  <p className="text-white/70 text-xs mt-1">₹{p.pricing?.S} · ₹{p.pricing?.L} · ₹{p.pricing?.XL}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              <p className="text-xs uppercase tracking-[0.12em] text-white/70">{p.publishStatus}</p>
                              <p className={`text-xs mt-1 ${p.isActive ? "text-emerald-300" : "text-amber-300"}`}>{p.isActive ? "active" : "inactive"}</p>
                            </td>
                            <td className="p-3 align-top">
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => onEditProduct(p)} className="border border-white/25 px-2 py-1 rounded text-xs">Edit</button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    saveAdminProduct(supabase, {
                                      id: p.dbId,
                                      publish_status: p.publishStatus === "published" ? "draft" : "published",
                                    }).then(refreshProductsList)
                                  }
                                  className="border border-sky-300/35 text-sky-200 px-2 py-1 rounded text-xs"
                                >
                                  {p.publishStatus === "published" ? "Unpublish" : "Publish"}
                                </button>
                                <button type="button" onClick={() => onDeleteProduct(p.dbId)} className="border border-rose-300/35 text-rose-200 px-2 py-1 rounded text-xs">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!products.length && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-white/55">No products found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "orders" && (
            <section>
              <h2 className="text-3xl font-black">Orders</h2>
              <p className="mt-2 text-white/60">Filter orders, inspect details, and move status through timeline.</p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_180px_180px_180px_auto] gap-2">
                <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search by order ref" className="bg-black/40 border border-white/20 px-3 py-2 rounded" />
                <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="bg-black/40 border border-white/20 px-3 py-2 rounded">
                  <option value="all">All status</option>
                  <option value="Placed">Placed</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <input type="date" value={orderDateFrom} onChange={(e) => setOrderDateFrom(e.target.value)} className="bg-black/40 border border-white/20 px-3 py-2 rounded" />
                <input type="date" value={orderDateTo} onChange={(e) => setOrderDateTo(e.target.value)} className="bg-black/40 border border-white/20 px-3 py-2 rounded" />
                <button type="button" onClick={refreshOrders} className="border border-white/25 px-4 py-2 rounded text-xs uppercase tracking-[0.14em]">Apply</button>
              </div>

              <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
                <div className="border border-white/10 rounded-xl overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-white/70 uppercase tracking-[0.12em] text-xs">
                      <tr>
                        <th className="p-3 text-left">Order</th>
                        <th className="p-3 text-left">Amount</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.dbId} className="border-t border-white/10">
                          <td className="p-3">
                            <button type="button" onClick={() => setActiveOrder(o)} className="underline underline-offset-2">
                              {o.order_ref || o.dbId?.slice(0, 8)}
                            </button>
                            <p className="text-white/55 text-xs mt-1">{new Date(o.created_at).toLocaleString()}</p>
                          </td>
                          <td className="p-3">₹{o.amount}</td>
                          <td className="p-3">{o.status}</td>
                          <td className="p-3">
                            <select
                              value={orderDrafts[o.dbId] || o.status}
                              onChange={(e) => setOrderDrafts((prev) => ({ ...prev, [o.dbId]: e.target.value }))}
                              className="bg-black/40 border border-white/20 px-2 py-1 rounded"
                            >
                              <option>Placed</option>
                              <option>Processing</option>
                              <option>Shipped</option>
                              <option>Delivered</option>
                              <option>Cancelled</option>
                            </select>
                            <button onClick={() => onUpdateOrderStatus(o.dbId)} className="ml-2 border border-white/25 px-2 py-1 rounded text-xs">Save</button>
                          </td>
                        </tr>
                      ))}
                      {!orders.length && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-white/55">No orders found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border border-white/10 rounded-xl p-5 bg-[#121214]">
                  <h3 className="text-xl font-bold">Order Details</h3>
                  {!activeOrder ? (
                    <p className="mt-4 text-white/60">Pick an order to inspect details.</p>
                  ) : (
                    <div className="mt-4 space-y-3 text-sm">
                      <p><span className="text-white/60">Order:</span> {activeOrder.order_ref || activeOrder.dbId}</p>
                      <p><span className="text-white/60">Amount:</span> ₹{activeOrder.amount}</p>
                      <p><span className="text-white/60">Customer:</span> {activeOrder.user_id}</p>
                      <p><span className="text-white/60">Shipping:</span> {activeOrder.shipping?.address || "N/A"}</p>
                      <div>
                        <p className="text-white/60 mb-1">Timeline</p>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em]">
                          {["Placed", "Processing", "Shipped", "Delivered"].map((s) => (
                            <span
                              key={s}
                              className={`px-2 py-1 rounded border ${String(activeOrder.status) === s ? "border-emerald-300/50 text-emerald-200" : "border-white/20 text-white/60"}`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-white/60 mb-1">Items</p>
                        <div className="space-y-1">
                          {(Array.isArray(activeOrder.items) ? activeOrder.items : []).map((it, idx) => (
                            <p key={`${activeOrder.dbId}-${idx}`} className="text-white/80">{it.title} · {it.size} · Qty {it.qty}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === "reviews" && (
            <section>
              <h2 className="text-3xl font-black">Reviews Moderation</h2>
              <p className="mt-2 text-white/60">Approve, reject, or remove user reviews.</p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[220px_260px_auto] gap-2">
                <select value={reviewStatusFilter} onChange={(e) => setReviewStatusFilter(e.target.value)} className="bg-black/40 border border-white/20 px-3 py-2 rounded">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select value={reviewProductFilter} onChange={(e) => setReviewProductFilter(e.target.value)} className="bg-black/40 border border-white/20 px-3 py-2 rounded">
                  <option value="all">All products</option>
                  {products.map((p) => (
                    <option key={p.dbId} value={p.dbId}>{p.title}</option>
                  ))}
                </select>
                <button type="button" onClick={refreshReviews} className="border border-white/25 px-4 py-2 rounded text-xs uppercase tracking-[0.14em] justify-self-start">Apply</button>
              </div>

              <div className="mt-5 border border-white/10 rounded-xl overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/70 uppercase tracking-[0.12em] text-xs">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-left">Rating</th>
                      <th className="p-3 text-left">Review</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id} className="border-t border-white/10 align-top">
                        <td className="p-3">{r.products?.title || r.product_id}</td>
                        <td className="p-3">{r.rating}</td>
                        <td className="p-3">
                          <p className="font-semibold">{r.title}</p>
                          <p className="text-white/70 mt-1">{r.review_text}</p>
                        </td>
                        <td className="p-3">{r.review_status || "pending"}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => onSetReviewStatus(r.id, "approved")} className="border border-emerald-300/40 text-emerald-200 px-2 py-1 rounded text-xs">Approve</button>
                            <button type="button" onClick={() => onSetReviewStatus(r.id, "rejected")} className="border border-amber-300/40 text-amber-200 px-2 py-1 rounded text-xs">Reject</button>
                            <button type="button" onClick={() => onDeleteReview(r.id)} className="border border-rose-300/40 text-rose-200 px-2 py-1 rounded text-xs">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!reviews.length && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-white/55">No reviews found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {["coupons", "customers", "settings"].includes(activeSection) && (
            <section className="border border-white/10 rounded-xl p-6 bg-[#121214]">
              <h2 className="text-3xl font-black capitalize">{activeSection}</h2>
              <p className="mt-3 text-white/60">Phase 2 module placeholder. We can implement this next exactly to your preferred workflow.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="border border-white/10 bg-[#121214] rounded-xl p-4">
      <p className="text-white/60 text-sm">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

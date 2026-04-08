import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainHeader from "../components/MainHeader";
import MapboxAddressInput from "../components/MapboxAddressInput";
import { useShop } from "../context/ShopContext";
import { WHATSAPP_PHONE } from "../data/products";

const ADDRESS_BOOK_STORAGE_KEY_PREFIX = "tas-address-book";

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    authUser,
    authReady,
    orders,
    shippingDetails,
    updateProfileAddressDetails,
    logout,
    changePasswordWithCurrent,
    deleteAccountWithPassword,
  } = useShop();
  const [activeSection, setActiveSection] = useState("orders");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityMessageType, setSecurityMessageType] = useState("success");
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deletePassword, setDeletePassword] = useState("");
  const [addressBook, setAddressBook] = useState([]);
  const [defaultAddressIndex, setDefaultAddressIndex] = useState(0);
  const [editingAddressIndex, setEditingAddressIndex] = useState(-1);
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    landmark: "",
    address: "",
  });

  useEffect(() => {
    if (authReady && !authUser) {
      navigate("/login", { replace: true });
    }
  }, [authReady, authUser, navigate]);

  useEffect(() => {
    if (!authUser?.email) return;

    const storageKey = `${ADDRESS_BOOK_STORAGE_KEY_PREFIX}:${authUser.email.toLowerCase()}`;
    const storedRaw = localStorage.getItem(storageKey);

    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw);
        const storedAddresses = Array.isArray(parsed?.addresses) ? parsed.addresses : [];
        if (storedAddresses.length > 0) {
          const safeDefault = Number.isInteger(parsed?.defaultIndex)
            ? Math.min(Math.max(parsed.defaultIndex, 0), storedAddresses.length - 1)
            : 0;

          setAddressBook(storedAddresses);
          setDefaultAddressIndex(safeDefault);
          setAddressForm(storedAddresses[safeDefault]);
          setIsEditingAddress(false);
          return;
        }
      } catch {
        // Fall back to shipping profile below.
      }
    }

    if (shippingDetails.address) {
      const seeded = [{ ...shippingDetails }];
      setAddressBook(seeded);
      setDefaultAddressIndex(0);
      setAddressForm(shippingDetails);
      setIsEditingAddress(false);
      localStorage.setItem(storageKey, JSON.stringify({ addresses: seeded, defaultIndex: 0 }));
      return;
    }

    setAddressBook([]);
    setDefaultAddressIndex(0);
    setAddressForm({ fullName: authUser.name || "", phone: "", landmark: "", address: "" });
    setEditingAddressIndex(-1);
    setIsEditingAddress(true);
    setActiveSection("addresses");
  }, [authUser?.email, authUser?.name, shippingDetails]);

  if (!authReady || !authUser) return null;

  const supportPhone = WHATSAPP_PHONE;
  const whatsappDigits = WHATSAPP_PHONE.replace(/\D/g, "");
  const sectionCards = [
    {
      id: "orders",
      title: "Orders",
      subtitle: "Track placed orders and history",
    },
    {
      id: "addresses",
      title: "Addresses",
      subtitle: "Manage saved delivery details",
    },
    {
      id: "security",
      title: "Login & Security",
      subtitle: "View account and login controls",
    },
    {
      id: "contact",
      title: "Contact Us",
      subtitle: "Call now or chat now instantly",
    },
  ];

  const persistAddressBook = (addresses, nextDefaultIndex) => {
    if (!authUser?.email) return;
    const storageKey = `${ADDRESS_BOOK_STORAGE_KEY_PREFIX}:${authUser.email.toLowerCase()}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        addresses,
        defaultIndex: Math.max(0, Math.min(nextDefaultIndex, Math.max(addresses.length - 1, 0))),
      })
    );
  };

  const onSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.fullName.trim() || !addressForm.phone.trim() || !addressForm.address.trim()) {
      setMessage("Name, phone, and map address are required.");
      setMessageType("error");
      return;
    }

    const normalized = {
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.trim(),
      landmark: addressForm.landmark.trim(),
      address: addressForm.address.trim(),
    };

    const nextAddresses = [...addressBook];
    let savedIndex = editingAddressIndex;

    if (editingAddressIndex >= 0 && editingAddressIndex < nextAddresses.length) {
      nextAddresses[editingAddressIndex] = normalized;
    } else {
      nextAddresses.push(normalized);
      savedIndex = nextAddresses.length - 1;
    }

    const nextDefault = nextAddresses.length === 1 ? 0 : defaultAddressIndex;
    setAddressBook(nextAddresses);
    setDefaultAddressIndex(nextDefault);
    setAddressForm(nextAddresses[nextDefault] || normalized);
    setEditingAddressIndex(-1);
    setIsEditingAddress(false);
    persistAddressBook(nextAddresses, nextDefault);

    if (savedIndex === nextDefault || !shippingDetails.address) {
      const result = await updateProfileAddressDetails(nextAddresses[nextDefault]);
      if (result?.ok === false) {
        setMessage("Address saved, but default sync failed. Please try Set as Default again.");
        setMessageType("error");
        return;
      }
    }

    setMessage(editingAddressIndex >= 0 ? "Address updated successfully." : "Address saved successfully.");
    setMessageType("success");
  };

  const handleStartAddAddress = () => {
    setEditingAddressIndex(-1);
    setAddressForm({
      fullName: authUser.name || "",
      phone: "",
      landmark: "",
      address: "",
    });
    setMessage("");
    setIsEditingAddress(true);
  };

  const handleStartEditAddress = (index) => {
    const selected = addressBook[index];
    if (!selected) return;
    setEditingAddressIndex(index);
    setAddressForm(selected);
    setMessage("");
    setIsEditingAddress(true);
  };

  const handleSetDefaultAddress = async (index) => {
    const selected = addressBook[index];
    if (!selected) return;

    setDefaultAddressIndex(index);
    setAddressForm(selected);
    persistAddressBook(addressBook, index);

    const result = await updateProfileAddressDetails(selected);
    if (result?.ok === false) {
      setMessage("Could not set default address. Please try again.");
      setMessageType("error");
      return;
    }

    setMessage("Default address updated.");
    setMessageType("success");
  };

  const handleRemoveAddress = async (index) => {
    if (index < 0 || index >= addressBook.length) return;

    const nextAddresses = addressBook.filter((_, idx) => idx !== index);
    const nextDefault = nextAddresses.length === 0
      ? 0
      : index === defaultAddressIndex
        ? 0
        : index < defaultAddressIndex
          ? defaultAddressIndex - 1
          : defaultAddressIndex;

    setAddressBook(nextAddresses);
    setDefaultAddressIndex(nextDefault);
    persistAddressBook(nextAddresses, nextDefault);

    if (nextAddresses.length === 0) {
      await updateProfileAddressDetails({
        fullName: authUser.name || "",
        phone: "",
        landmark: "",
        address: "",
      });
      setAddressForm({ fullName: authUser.name || "", phone: "", landmark: "", address: "" });
      setIsEditingAddress(true);
      setEditingAddressIndex(-1);
      setMessage("Address removed. Please add a new address.");
      setMessageType("success");
      return;
    }

    setAddressForm(nextAddresses[nextDefault]);
    const result = await updateProfileAddressDetails(nextAddresses[nextDefault]);
    if (result?.ok === false) {
      setMessage("Address removed, but default sync failed. Please set default again.");
      setMessageType("error");
      return;
    }

    setMessage("Address removed successfully.");
    setMessageType("success");
  };

  const renderOrders = () => {
    return (
      <div className="border border-white/10 bg-white/[0.03] rounded-sm p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">Orders</h2>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs uppercase tracking-[0.24em] text-white/70 hover:text-white"
          >
            Shop More
          </button>
        </div>

        {!orders.length ? (
          <p className="mt-6 text-white/65">No orders yet. Place your first order from the cart.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-white/10 bg-black/25 rounded-sm p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/55 uppercase tracking-[0.18em]">{order.id}</p>
                    <p className="mt-1 text-lg font-bold">₹{order.amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/60">{order.date}</p>
                    <p className="text-sm text-emerald-300 mt-1">{order.status}</p>
                  </div>
                </div>
                <div className="mt-3 text-sm text-white/70">
                  {order.items.map((item, idx) => (
                    <p key={`${order.id}-${idx}`}>{item.title} • {item.size} • Qty {item.qty}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAddresses = () => {
    return (
      <div className="border border-white/10 bg-white/[0.03] rounded-sm p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">Addresses</h2>
          {!isEditingAddress && (
            <button
              type="button"
              onClick={handleStartAddAddress}
              className="text-xs uppercase tracking-[0.24em] text-white/70 hover:text-white"
            >
              Add Address
            </button>
          )}
        </div>

        {isEditingAddress ? (
          <form onSubmit={onSaveAddress} className="mt-6 space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">
              {editingAddressIndex >= 0 ? "Edit Address" : "Add New Address"}
            </p>
            <label className="text-xs uppercase tracking-[0.24em] text-white/55">Full Name</label>
            <input
              value={addressForm.fullName}
              onChange={(e) => {
                setAddressForm((prev) => ({ ...prev, fullName: e.target.value }));
                setMessage("");
              }}
              className="w-full bg-black/40 border border-white/20 rounded-sm px-4 py-3.5 outline-none focus:border-white transition-colors"
              placeholder="Recipient full name"
            />

            <label className="text-xs uppercase tracking-[0.24em] text-white/55">Phone Number</label>
            <input
              value={addressForm.phone}
              onChange={(e) => {
                const nextPhone = e.target.value.replace(/[^0-9+\s-]/g, "");
                setAddressForm((prev) => ({ ...prev, phone: nextPhone }));
                setMessage("");
              }}
              className="w-full bg-black/40 border border-white/20 rounded-sm px-4 py-3.5 outline-none focus:border-white transition-colors"
              placeholder="Phone number"
            />

            <label className="text-xs uppercase tracking-[0.24em] text-white/55">Landmark (Optional)</label>
            <input
              value={addressForm.landmark}
              onChange={(e) => {
                setAddressForm((prev) => ({ ...prev, landmark: e.target.value }));
                setMessage("");
              }}
              className="w-full bg-black/40 border border-white/20 rounded-sm px-4 py-3.5 outline-none focus:border-white transition-colors"
              placeholder="Near mosque, school, mall, etc."
            />

            <label className="text-xs uppercase tracking-[0.24em] text-white/55">Address From Mapbox</label>
            <MapboxAddressInput
              value={addressForm.address}
              onChange={(address) => {
                setAddressForm((prev) => ({ ...prev, address }));
              }}
              onEdit={() => setMessage("")}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" className="bg-white text-black py-3.5 px-6 rounded-sm uppercase tracking-[0.2em] font-bold active:scale-[0.98] transition-transform">
                Save Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingAddress(false);
                  setEditingAddressIndex(-1);
                  setMessage("");
                }}
                className="border border-white/30 rounded-sm px-6 py-3.5 text-xs uppercase tracking-[0.18em] text-white/85 hover:bg-white/10 active:scale-[0.98] transition-transform"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={handleStartAddAddress}
              className="min-h-[180px] sm:min-h-[220px] border border-dashed border-white/30 bg-black/25 rounded-sm flex flex-col items-center justify-center hover:bg-white/[0.06] active:scale-[0.98] transition"
            >
              <span className="text-5xl sm:text-6xl leading-none text-white/35">+</span>
              <span className="mt-2 text-xl sm:text-2xl font-bold text-white/80">Add address</span>
            </button>

            {addressBook.map((entry, index) => {
              const isDefault = index === defaultAddressIndex;
              return (
                <div key={`${entry.fullName}-${entry.phone}-${index}`} className="min-h-[180px] sm:min-h-[220px] border border-white/20 bg-black/25 rounded-sm p-4 sm:p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                    {isDefault ? "Default" : "Address"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{entry.fullName}</p>
                  {entry.landmark && <p className="text-white/70 mt-1">{entry.landmark}</p>}
                  <p className="text-white/80 mt-1 whitespace-pre-line">{entry.address}</p>
                  <p className="text-white/75 mt-1">Phone number: {entry.phone}</p>
                  <button type="button" className="mt-1 text-sm text-white/65 underline underline-offset-2">
                    Add delivery instructions
                  </button>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/85">
                    <button type="button" onClick={() => handleStartEditAddress(index)} className="hover:text-white underline underline-offset-2">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleRemoveAddress(index)} className="hover:text-white underline underline-offset-2">
                      Remove
                    </button>
                    {!isDefault && (
                      <button type="button" onClick={() => handleSetDefaultAddress(index)} className="hover:text-white underline underline-offset-2">
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {message && (
          <p className={`mt-4 text-sm ${messageType === "error" ? "text-rose-300" : "text-emerald-300"}`}>
            {message}
          </p>
        )}
      </div>
    );
  };

  const renderSecurity = () => {
    const onChangePassword = async (e) => {
      e.preventDefault();
      setSecurityMessage("");

      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setSecurityMessage("All password fields are required.");
        setSecurityMessageType("error");
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setSecurityMessage("New password and confirm password must match.");
        setSecurityMessageType("error");
        return;
      }

      setChangingPassword(true);
      const result = await changePasswordWithCurrent({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (!result.ok) {
        setSecurityMessage(result.message || "Could not change password.");
        setSecurityMessageType("error");
      } else {
        setSecurityMessage(result.message || "Password changed successfully.");
        setSecurityMessageType("success");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
      setChangingPassword(false);
    };

    const onDeleteAccount = async (e) => {
      e.preventDefault();
      setSecurityMessage("");

      if (!deletePassword.trim()) {
        setSecurityMessage("Please enter password to delete account.");
        setSecurityMessageType("error");
        return;
      }

      setDeletingAccount(true);
      try {
        const result = await deleteAccountWithPassword({ password: deletePassword });
        if (!result.ok) {
          setSecurityMessage(result.message || "Account deletion failed.");
          setSecurityMessageType("error");
          return;
        }

        navigate("/account-deleted", { replace: true });
      } catch (error) {
        setSecurityMessage(error.message || "Account deletion failed.");
        setSecurityMessageType("error");
      } finally {
        setDeletingAccount(false);
      }
    };

    return (
      <div className="border border-white/10 bg-white/[0.03] rounded-sm p-4 sm:p-6 md:p-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">Login & Security</h2>
        <div className="mt-4 sm:mt-6 border border-white/10 bg-black/25 p-4 sm:p-5 rounded-sm space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Account</p>
          <p className="text-white font-semibold">{authUser.name}</p>
          <p className="text-white/75">{authUser.email}</p>
          {shippingDetails.phone && <p className="text-white/70">Phone: {shippingDetails.phone}</p>}
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="border border-white/30 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/85 hover:bg-white/10 active:scale-[0.98] transition-transform"
            >
              Login Page
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="border border-rose-300/40 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-500/10 active:scale-[0.98] transition-transform"
            >
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={onChangePassword} className="mt-4 sm:mt-6 border border-white/10 bg-black/25 p-4 sm:p-5 rounded-sm space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Change Password</p>
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Current password"
            className="w-full bg-black/40 border border-white/20 rounded-sm px-4 py-3.5 outline-none focus:border-white transition-colors"
          />
          <input
            type="password"
            minLength={6}
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            placeholder="New password"
            className="w-full bg-black/40 border border-white/20 rounded-sm px-4 py-3.5 outline-none focus:border-white transition-colors"
          />
          <input
            type="password"
            minLength={6}
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm password"
            className="w-full bg-black/40 border border-white/20 rounded-sm px-4 py-3.5 outline-none focus:border-white transition-colors"
          />
          <button
            type="submit"
            disabled={changingPassword}
            className="border border-white/30 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/85 hover:bg-white/10 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {changingPassword ? "Updating..." : "Change Password"}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 border border-rose-300/30 bg-rose-900/10 p-4 sm:p-5 rounded-sm space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200/80">Delete Account</p>
          <p className="text-white/75 text-sm">
            Deleting your account is permanent. This action is blocked if you have pending orders.
          </p>

          {!showDeletePrompt ? (
            <button
              type="button"
              onClick={() => {
                setShowDeletePrompt(true);
                setSecurityMessage("");
              }}
              className="border border-rose-400/70 bg-rose-600/80 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white hover:bg-rose-600 active:scale-[0.98] transition-transform"
            >
              Delete Account
            </button>
          ) : (
            <form onSubmit={onDeleteAccount} className="space-y-3">
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter password to delete account"
                className="w-full bg-black/40 border border-rose-300/40 rounded-sm px-4 py-3.5 outline-none focus:border-rose-300 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={deletingAccount}
                  className="border border-rose-400/70 bg-rose-600/90 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white hover:bg-rose-600 active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {deletingAccount ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeletePrompt(false);
                    setDeletePassword("");
                  }}
                  className="border border-white/30 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/85 hover:bg-white/10 active:scale-[0.98] transition-transform"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {securityMessage && (
          <p className={`mt-4 text-sm ${securityMessageType === "error" ? "text-rose-300" : "text-emerald-300"}`}>
            {securityMessage}
          </p>
        )}
      </div>
    );
  };

  const renderContact = () => {
    return (
      <div className="border border-white/10 bg-white/[0.03] rounded-sm p-4 sm:p-6 md:p-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">Contact Us</h2>
        <div className="mt-4 sm:mt-6 border border-white/10 bg-black/25 p-4 sm:p-5 rounded-sm">
          <p className="text-white/80">Need help with orders, delivery, or custom art requests? We are available now.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={`tel:${supportPhone}`}
              className="border border-white/30 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/85 hover:bg-white/10 active:scale-[0.98] transition-transform"
            >
              Call Now
            </a>
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/30 rounded-sm px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/85 hover:bg-white/10 active:scale-[0.98] transition-transform"
            >
              Chat Now
            </a>
          </div>
          <p className="mt-4 text-sm text-white/60">Support Number: {supportPhone}</p>
        </div>
      </div>
    );
  };

  const renderSection = () => {
    if (activeSection === "orders") return renderOrders();
    if (activeSection === "addresses") return renderAddresses();
    if (activeSection === "security") return renderSecurity();
    return renderContact();
  };

  const ease = [0.22, 1, 0.36, 1];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MainHeader />
      <div className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-3 sm:px-6 md:px-12">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <div className="border border-white/10 bg-white/[0.03] rounded-sm p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/55">Your Account</p>
            <h1 className="mt-2 sm:mt-3 text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight">{authUser.name}</h1>
            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-white/70">{authUser.email}</p>

            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-4">
              {sectionCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveSection(card.id)}
                  className={`text-left border rounded-sm p-3 sm:p-4 transition-colors active:scale-[0.98] ${activeSection === card.id ? "border-white bg-white/10" : "border-white/15 bg-black/25 hover:bg-white/5"}`}
                >
                  <p className="text-sm sm:text-lg font-bold uppercase tracking-[0.08em]">{card.title}</p>
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/65 line-clamp-2">{card.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            {renderSection()}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

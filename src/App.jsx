import React from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import CartPage from "./pages/CartPage";
import ProductPage from "./pages/ProductPage";
import WishlistPage from "./pages/WishlistPage";
import ProfilePage from "./pages/ProfilePage";
import AccountActivatedPage from "./pages/AccountActivatedPage";
import AccountDeletionCompletedPage from "./pages/AccountDeletionCompletedPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function NotFoundPage() {
	return (
		<div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 text-center">
			<h1 className="text-5xl font-black">404</h1>
			<p className="mt-2 text-white/70 uppercase tracking-[0.2em]">Page Not Found</p>
			<Link to="/" className="mt-6 underline">
				Go back home
			</Link>
		</div>
	);
}

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<LoginPage />} />
			<Route path="/sign-in" element={<LoginPage />} />
			<Route path="/signup" element={<SignupPage />} />
			<Route path="/sign-up" element={<SignupPage />} />
			<Route path="/auth/confirmed" element={<AccountActivatedPage />} />
			<Route path="/account-deleted" element={<AccountDeletionCompletedPage />} />
			<Route path="/cart" element={<CartPage />} />
			<Route path="/product/:productKey" element={<ProductPage />} />
			<Route path="/wishlist" element={<WishlistPage />} />
			<Route path="/profile" element={<ProfilePage />} />
			<Route path="/admin" element={<Navigate to="/admin/login" replace />} />
			<Route path="/admin/login" element={<AdminLoginPage />} />
			<Route path="/admin/dashboard" element={<AdminDashboardPage />} />
			<Route path="*" element={<NotFoundPage />} />
			<Route path="/home" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
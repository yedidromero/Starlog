import type { Metadata } from "next";
import { AccountDashboard } from "./AccountDashboard";

export const metadata: Metadata = {
  title: "My Starlog · Your travel journal",
  description: "Your trips, purchases, travel passport and recommendations in one place.",
};

export default function MyStarlogPage() {
  return <AccountDashboard />;
}

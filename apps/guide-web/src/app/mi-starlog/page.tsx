import type { Metadata } from "next";
import { AccountDashboard } from "./AccountDashboard";

export const metadata: Metadata = {
  title: "My Starlog · Your trips and experiences",
  description: "View your trips, purchases, profile and personalized Starlog recommendations.",
};

export default function MyStarlogPage() {
  return <AccountDashboard />;
}

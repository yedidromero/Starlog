import type { Metadata } from "next";
import EditorialHome from "./EditorialHome";

export const metadata: Metadata = {
  title: "Starlog · Travel, your way",
  description: "Explore travel offers, events and community on Stellar.",
};

export default function Page() {
  return <EditorialHome />;
}

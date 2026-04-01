import { redirect } from "next/navigation";

export default function EbayCallbackRedirect() {
  redirect("/admin/ebay-callback");
}

import { redirect } from "next/navigation";

/** Global branches directory removed — branches live under each organization. */
export default function BranchesRedirectPage() {
  redirect("/organizations");
}

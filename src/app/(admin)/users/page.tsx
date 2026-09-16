import { redirect } from "next/navigation";

/** Global users directory removed — users live under each organization. */
export default function UsersRedirectPage() {
  redirect("/organizations");
}

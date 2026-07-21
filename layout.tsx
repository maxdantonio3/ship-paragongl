import { redirect } from "next/navigation";

// ship.paragongl.com → ship.paragongl.com/tracking
// Future: replace with a proper portal landing page
export default function Home() {
  redirect("/tracking");
}

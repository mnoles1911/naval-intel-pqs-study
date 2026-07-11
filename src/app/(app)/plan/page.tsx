import { redirect } from "next/navigation";

// The floor plan now lives inside the merged Venue tab. Keep this route as a
// redirect so old links (and the day-of setup sheets) still resolve.
export default function PlanRedirect() {
  redirect("/locations");
}

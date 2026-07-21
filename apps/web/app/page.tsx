import { DashboardShell } from "@/components/dashboard-shell";
import { demoSnapshot } from "@/data/demo";

export default function Home() {
  return <DashboardShell initialSnapshot={demoSnapshot} />;
}

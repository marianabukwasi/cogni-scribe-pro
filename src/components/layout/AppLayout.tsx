import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

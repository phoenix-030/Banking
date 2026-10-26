import { Outlet } from "react-router-dom";

import Navbar from "../../shared/components/navbar/Navbar";
import BottomNav from "../../shared/components/navbar/BottomNav";
import Footer from "../../shared/components/Footer";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">

      <Navbar />

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <Footer />

      <BottomNav />

    </div>
  );
};

export default MainLayout;
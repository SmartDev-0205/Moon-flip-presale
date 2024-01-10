import { lazy, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { Outlet } from "react-router-dom";
// ---------------------------------------------------------------------------------------

const Navbar = lazy(() => import("./Navbar"));
const Footer = lazy(() => import("./Footer"));

// ---------------------------------------------------------------------------------------

export default function LandingLayout() {
  const isMobile = useMediaQuery({ maxWidth: 480 });
  const isTablet = useMediaQuery({ minWidth: 480, maxWidth: 768 });
  const isLaptop = useMediaQuery({ minWidth: 768, maxWidth: 1024 });
  const isDesktop = useMediaQuery({ minWidth: 1024, maxWidth: 1280 });

  useEffect(() => { }, [isMobile, isTablet, isLaptop, isDesktop]);

  return (
    <>
      <div className="min-h-screen flex flex-col bg-[#0C2349]">
        {/* <Navbar /> */}
        <div>
          <Outlet />
        </div>
        {/* <Footer /> */}
      </div>
    </>
  );
}

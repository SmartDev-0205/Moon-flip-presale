import { lazy } from "react";
import { useRoutes } from "react-router-dom";
import LandingLayout from "./layouts";

// Import components
const Home = lazy(() => import("./components/Home"));
// ----------------------------------------------------------------------------------

export default function Routes() {
  return useRoutes([
    {
      path: "",
      element: <LandingLayout />,
      children: [
        {
          path: "/",
          element: <Home />,
        },
      ],
    },
  ]);
}

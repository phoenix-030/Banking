import { RouterProvider } from "react-router-dom";
import { router } from "./router";

const AllRoutes = () => {
  return (
    <RouterProvider router={router} />
  );
};

export default AllRoutes;
import { Suspense } from "react";
import Loader from "../components/Loader";

const withSuspense = (Component) => (
  <Suspense fallback={<Loader />}>
    <Component />
  </Suspense>
);

export default withSuspense;
import { lazy } from "react";
import MainLayout from "./layouts/MainLayout";
import withSuspense from "../shared/utils/WithSuspense";

const Home = lazy(() => import("../features/home/Home"));
const Dashboard = lazy(() => import("../features/dashboard/Dashboard"));
const MockTests = lazy(() => import("../features/mockTests/pages/MockTests"));
const TestPage = lazy(() => import("../features/mockTests/pages/TestPage"));
const PreviousPapers = lazy(() => import("../features/previousPapers/pages/PreviousPapers"));
const PreviousPaperDetails = lazy(() =>
  import("../features/previousPapers/pages/PaperDetails")
);
const StudyHub = lazy(() => import("../features/studyhub/StudyHub"));
const NotFound = lazy(() => import("../shared/pages/NotFound"));
const aimentor = lazy(() => import("../features/aimentor/aimentor"))
export const routes = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: withSuspense(Home) },
      { path: "dashboard", element: withSuspense(Dashboard) },
      { path: "mock-tests", element: withSuspense(MockTests) },
      { path: "mock-tests/:examName", element: withSuspense(TestPage) },
      { path: "previous-papers", element: withSuspense(PreviousPapers) },
      {
        path: "previous-papers/:examId",
        element: withSuspense(PreviousPaperDetails),
      },
      {
        path: "ai-tutor",
        element: withSuspense(aimentor),
      },
      { path: "study-hub", element: withSuspense(StudyHub) },
    ],
  },
  {
    path: "*",
    element: withSuspense(NotFound),
  },
];
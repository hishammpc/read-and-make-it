import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import UsersList from "./pages/admin/UsersList";
import UserCreate from "./pages/admin/UserCreate";
import UserEdit from "./pages/admin/UserEdit";
import BulkUserImport from "./pages/admin/BulkUserImport";
import ProgramsList from "./pages/admin/ProgramsList";
import ProgramCreate from "./pages/admin/ProgramCreate";
import ProgramEdit from "./pages/admin/ProgramEdit";
import ProgramDetails from "./pages/admin/ProgramDetails";
import ProgramAssign from "./pages/admin/ProgramAssign";
import Attendance from "./pages/admin/Attendance";
import Certificates from "./pages/admin/Certificates";
import CertificateUpload from "./pages/admin/CertificateUpload";
import Evaluations from "./pages/admin/Evaluations";
import EvaluationTemplateCreate from "./pages/admin/EvaluationTemplateCreate";
import EvaluationTemplateEdit from "./pages/admin/EvaluationTemplateEdit";
import Reports from "./pages/admin/Reports";
import MyTrainings from "./pages/employee/MyTrainings";
import MyHours from "./pages/employee/MyHours";
import MyCertificates from "./pages/employee/MyCertificates";
import MyEvaluations from "./pages/employee/MyEvaluations";
import EvaluationForm from "./pages/employee/EvaluationForm";
import EvaluationPreview from "./pages/preview/EvaluationPreview";
import CertificateTest from "./pages/admin/CertificateTest";
import AnnualEvaluationTest from "./pages/admin/AnnualEvaluationTest";
// Annual Evaluation pages
import AnnualEvaluations from "./pages/admin/AnnualEvaluations";
import AnnualEvaluationCycle from "./pages/admin/AnnualEvaluationCycle";
import AnnualEvaluationResult from "./pages/admin/AnnualEvaluationResult";
import MyAnnualEvaluation from "./pages/employee/MyAnnualEvaluation";
import AnnualEvaluationForm from "./pages/employee/AnnualEvaluationForm";
import SuperviseeEvaluations from "./pages/employee/SuperviseeEvaluations";
import SupervisorEvaluationForm from "./pages/employee/SupervisorEvaluationForm";
// Proposed Trainings
import ProposedTrainings from "./pages/admin/ProposedTrainings";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <UsersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/create"
              element={
                <ProtectedRoute>
                  <UserCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id/edit"
              element={
                <ProtectedRoute>
                  <UserEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/bulk-import"
              element={
                <ProtectedRoute>
                  <BulkUserImport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/programs"
              element={
                <ProtectedRoute>
                  <ProgramsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/programs/new"
              element={
                <ProtectedRoute>
                  <ProgramCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/programs/:id"
              element={
                <ProtectedRoute>
                  <ProgramDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/programs/:id/edit"
              element={
                <ProtectedRoute>
                  <ProgramEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/programs/:id/assign"
              element={
                <ProtectedRoute>
                  <ProgramAssign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/attendance"
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/certificates"
              element={
                <ProtectedRoute>
                  <Certificates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/certificates/upload"
              element={
                <ProtectedRoute>
                  <CertificateUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/evaluations"
              element={
                <ProtectedRoute>
                  <Evaluations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/evaluations/templates/new"
              element={
                <ProtectedRoute>
                  <EvaluationTemplateCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/evaluations/templates/:id/edit"
              element={
                <ProtectedRoute>
                  <EvaluationTemplateEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-trainings"
              element={
                <ProtectedRoute>
                  <MyTrainings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-hours"
              element={
                <ProtectedRoute>
                  <MyHours />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-certificates"
              element={
                <ProtectedRoute>
                  <MyCertificates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-evaluations"
              element={
                <ProtectedRoute>
                  <MyEvaluations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-evaluations/:programId/submit"
              element={
                <ProtectedRoute>
                  <EvaluationForm />
                </ProtectedRoute>
              }
            />
            {/* Annual Evaluation routes */}
            <Route
              path="/dashboard/annual-evaluations"
              element={
                <ProtectedRoute>
                  <AnnualEvaluations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/annual-evaluations/:cycleId"
              element={
                <ProtectedRoute>
                  <AnnualEvaluationCycle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/annual-evaluations/:cycleId/staff/:userId"
              element={
                <ProtectedRoute>
                  <AnnualEvaluationResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-annual-evaluation"
              element={
                <ProtectedRoute>
                  <MyAnnualEvaluation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-annual-evaluation/:cycleId/submit"
              element={
                <ProtectedRoute>
                  <AnnualEvaluationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/supervisee-evaluations"
              element={
                <ProtectedRoute>
                  <SuperviseeEvaluations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/supervisee-evaluations/:cycleId/:userId"
              element={
                <ProtectedRoute>
                  <SupervisorEvaluationForm />
                </ProtectedRoute>
              }
            />
            {/* Proposed Trainings */}
            <Route
              path="/dashboard/proposed-trainings"
              element={
                <ProtectedRoute>
                  <ProposedTrainings />
                </ProtectedRoute>
              }
            />
            {/* Preview routes - no auth required */}
            <Route path="/preview/evaluation" element={<EvaluationPreview />} />
            <Route path="/certificate-test" element={<CertificateTest />} />
            <Route path="/annual-evaluation-test" element={<AnnualEvaluationTest />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

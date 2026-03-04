import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ParticipantSessionProvider } from "@/contexts/ParticipantSessionContext";
import { ManagerSessionProvider } from "@/contexts/ManagerSessionContext";
import { initializeStore } from "@/lib/emsStore";
import "@/lib/i18n";

// Layouts
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { SubAdminLayout } from "@/components/layout/SubAdminLayout";
import { ManagerLayout } from "@/components/layout/ManagerLayout";

// Admin Pages

import AdminDashboard from "@/pages/admin/Dashboard";
import ParticipantsPage from "@/pages/admin/Participants";
import ParticipantProfile from "@/pages/admin/ParticipantProfile";
import RegistrationsPage from "@/pages/admin/Registrations";
import EventSelector from "@/pages/admin/EventSelector";

import InvitationsPage from "@/pages/admin/Invitations";
import TravelPage from "@/pages/admin/Travel";
import AccommodationPage from "@/pages/admin/Accommodation";
import VisasPage from "@/pages/admin/Visas";
import AccreditationPage from "@/pages/admin/Accreditation";
import TransportationPage from "@/pages/admin/Transportation";
import NotificationsPage from "@/pages/admin/Notifications";
import AuditLogPage from "@/pages/admin/AuditLog";
import EquipmentPage from "@/pages/admin/Equipment";
import CrowdManagementPage from "@/pages/admin/CrowdManagement";
import ReportsPage from "@/pages/admin/Reports";
import ProjectsPage from "@/pages/admin/Projects";
import SubAdminsPage from "@/pages/admin/SubAdmins";
import AdminDelegationsPage from "@/pages/admin/Delegations";

// Auth Pages
import AdminLogin from "@/pages/auth/AdminLogin";
import StaffLogin from "@/pages/auth/StaffLogin";
import ParticipantLogin from "@/pages/auth/ParticipantLogin";
import ManagerLogin from "@/pages/auth/ManagerLogin";
import ManagerRegister from "@/pages/auth/ManagerRegister";

// SubAdmin Pages
import SubAdminDashboard from "@/pages/subadmin/Dashboard";

// Manager Pages
import ManagerDashboard from "@/pages/manager/Dashboard";
import ManagerTeamsPage from "@/pages/manager/Teams";
import ManagerAddMembersPage from "@/pages/manager/AddMembers";
import ManagerRegistrationsPage from "@/pages/manager/Registrations";
import ManagerDelegationsPage from "@/pages/manager/Delegations";
import ManagerDocumentsPage from "@/pages/manager/MemberDocuments";
import ManagerInvitationsPage from "@/pages/manager/Invitations";
import ManagerRegisterMemberPage from "@/pages/manager/RegisterMember";
import ManagerRegisterPage from "@/pages/manager/Register";
import ManagerVisaPage from "@/pages/manager/Visa";
import ManagerTravelPage from "@/pages/manager/Travel";
import ManagerAccommodationPage from "@/pages/manager/Accommodation";
import ManagerTransportationPage from "@/pages/manager/Transportation";
import ManagerAccreditationPage from "@/pages/manager/Accreditation";

// Public Pages
// Public Pages
// import MyStatusPage from "@/pages/public/MyStatus"; // Deprecated, now redirects
import MyStatusPage from "@/pages/public/MyStatus";
import SupportPage from "@/pages/public/Support";
import RSVPLanding from "@/pages/public/RSVPLanding";
import RegisterPage from "@/pages/public/Register";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";

// Portal Pages
import { ParticipantLayout } from "@/components/layout/ParticipantLayout";
import DashboardPage from "@/pages/public/portal/Dashboard";
import PortalTravelPage from "@/pages/public/portal/Travel";
import PortalAccommodationPage from "@/pages/public/portal/Accommodation";
import PortalRegistrationsPage from "@/pages/public/portal/Registrations";
import PortalInvitationsPage from "@/pages/public/portal/Invitations";
import PortalProfilePage from "@/pages/public/portal/Profile";
import PortalAccreditationPage from "@/pages/public/portal/Accreditation";
import PortalVisaPage from "@/pages/public/portal/Visa";
import PortalTransportationPage from "@/pages/public/portal/Transportation";

const queryClient = new QueryClient();

// Initialize store with Arabic dummy data
initializeStore();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ParticipantSessionProvider>
          <ManagerSessionProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Auth Routes */}
                <Route path="/login/admin" element={<AdminLogin />} />
                <Route path="/login/staff" element={<StaffLogin />} />
                <Route path="/login/participant" element={<ParticipantLogin />} />
                <Route path="/login/manager" element={<ManagerLogin />} />
                <Route path="/manager/register" element={<ManagerRegister />} />

                {/* Public Routes */}
                <Route path="/invite/:token" element={<RSVPLanding />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Quick Access */}
                <Route path="/" element={<Index />} />

                <Route element={<PublicLayout />}>
                  <Route path="/my-status" element={<MyStatusPage />} />
                  <Route path="/support" element={<SupportPage />} />
                </Route>

                {/* Participant Portal Routes */}
                <Route path="/portal" element={<ParticipantLayout />}>
                  <Route index element={<Navigate to="/portal/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="travel" element={<PortalTravelPage />} />
                  <Route path="accommodation" element={<PortalAccommodationPage />} />
                  <Route path="registrations" element={<PortalRegistrationsPage />} />
                  <Route path="invitations" element={<PortalInvitationsPage />} />
                  <Route path="accreditation" element={<PortalAccreditationPage />} />
                  <Route path="visa" element={<PortalVisaPage />} />
                  <Route path="transportation" element={<PortalTransportationPage />} />
                  <Route path="profile" element={<PortalProfilePage />} />
                  <Route path="support" element={<SupportPage />} />
                </Route>

                {/* Manager Portal Routes */}
                <Route path="/manager" element={<ManagerLayout />}>
                  <Route index element={<Navigate to="/manager/dashboard" replace />} />
                  <Route path="dashboard" element={<ManagerDashboard />} />
                  <Route path="invitations" element={<ManagerInvitationsPage />} />
                  <Route path="teams" element={<ManagerTeamsPage />} />
                  <Route path="add-members" element={<ManagerAddMembersPage />} />
                  <Route path="registrations" element={<ManagerRegistrationsPage />} />
                  <Route path="delegations" element={<ManagerDelegationsPage />} />
                  <Route path="documents" element={<ManagerDocumentsPage />} />
                  <Route path="register-member" element={<ManagerRegisterMemberPage />} />
                  <Route path="register-list" element={<ManagerRegisterPage />} />
                  <Route path="visa" element={<ManagerVisaPage />} />
                  <Route path="travel" element={<ManagerTravelPage />} />
                  <Route path="accommodation" element={<ManagerAccommodationPage />} />
                  <Route path="transportation" element={<ManagerTransportationPage />} />
                  <Route path="accreditation" element={<ManagerAccreditationPage />} />
                </Route>

                {/* Admin — Event Selector (no sidebar) */}
                <Route path="/admin" element={<EventSelector />} />

                {/* Admin — Event-scoped pages (with sidebar) */}
                <Route path="/admin/events/:eventId" element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="participants" element={<ParticipantsPage />} />
                  <Route path="participants/:id" element={<ParticipantProfile />} />
                  <Route path="invitations" element={<InvitationsPage />} />
                  <Route path="registrations" element={<RegistrationsPage />} />
                  <Route path="delegations" element={<AdminDelegationsPage />} />
                  <Route path="travel" element={<TravelPage />} />
                  <Route path="accommodation" element={<AccommodationPage />} />
                  <Route path="visas" element={<VisasPage />} />
                  <Route path="transportation" element={<TransportationPage />} />
                  <Route path="accreditation" element={<AccreditationPage />} />
                  <Route path="equipment" element={<EquipmentPage />} />
                  <Route path="crowd" element={<CrowdManagementPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="audit" element={<AuditLogPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="subadmins" element={<SubAdminsPage />} />
                </Route>


                {/* SubAdmin Routes */}
                <Route path="/subadmin" element={<SubAdminLayout />}>
                  <Route index element={<SubAdminDashboard />} />
                  <Route path="invitations" element={<InvitationsPage />} />
                  <Route path="registrations" element={<RegistrationsPage />} />
                  <Route path="travel" element={<TravelPage />} />
                  <Route path="accommodation" element={<AccommodationPage />} />
                  <Route path="visas" element={<VisasPage />} />
                  <Route path="transportation" element={<TransportationPage />} />
                  <Route path="accreditation" element={<AccreditationPage />} />
                  <Route path="equipment" element={<EquipmentPage />} />
                  <Route path="crowd" element={<CrowdManagementPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </ManagerSessionProvider>
        </ParticipantSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

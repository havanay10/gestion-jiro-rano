import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { AdminLayout } from './features/layout/AdminLayout'
import { PersonnelLayout } from './features/layout/PersonnelLayout'
import { TableauBordPage } from './features/tableau-bord/TableauBordPage'
import { LogementsPage } from './features/logements/LogementsPage'
import { PersonnesPage } from './features/personnes/PersonnesPage'
import { SaisiePeriodePage } from './features/periodes/SaisiePeriodePage'
import { HistoriquePage } from './features/historique/HistoriquePage'
import { DetailPeriodePage } from './features/periodes/DetailPeriodePage'
import { EspacePersonnelPage } from './features/espace-personnel/EspacePersonnelPage'

// Pages admin (à créer dans les sous-étapes suivantes)
function AdminAudit() {
  return <h2>Journal d’audit</h2>
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Routes admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roleRequis="admin">
                <AdminLayout>
                  <TableauBordPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logements"
            element={
              <ProtectedRoute roleRequis="admin">
                <AdminLayout>
                  <LogementsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/personnes"
            element={
              <ProtectedRoute roleRequis="admin">
                <AdminLayout>
                  <PersonnesPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/periodes"
            element={
              <ProtectedRoute roleRequis="admin">
                <AdminLayout>
                  <SaisiePeriodePage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/historique"
            element={
              <ProtectedRoute roleRequis="admin">
                <AdminLayout>
                  <HistoriquePage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/periodes/:periodeId"
            element={
            <ProtectedRoute roleRequis="admin">
              <AdminLayout>
                <DetailPeriodePage />
              </AdminLayout>
            </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute roleRequis="admin">
                <AdminLayout>
                  <AdminAudit />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Espace personnel */}
          <Route
            path="/espace"
            element={
              <ProtectedRoute roleRequis="personnel">
                <PersonnelLayout>
                  <EspacePersonnelPage />
                </PersonnelLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirections par défaut */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
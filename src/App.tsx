import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { AdminRoute } from './components/auth/AdminRoute'
import { AdminHomePage } from './pages/AdminHomePage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminProposalEditorPage } from './pages/AdminProposalEditorPage'
import { MapPage } from './pages/MapPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminHomePage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/proposals/new"
            element={
              <AdminRoute>
                <AdminProposalEditorPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/proposals/:proposalId"
            element={
              <AdminRoute>
                <AdminProposalEditorPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

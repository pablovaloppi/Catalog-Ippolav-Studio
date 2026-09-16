import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Storefront } from './Storefront';

const AdminPanel = lazy(() => import('./AdminPanel').then(m => ({ default: m.AdminPanel })));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <AdminPanel />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

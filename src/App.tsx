import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/Toast';
import { UploadModal } from './components/UploadModal';
import { FileDetailsModal } from './components/FileDetailsModal';
import { VaultFile } from './types';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';
import { UserDashboard } from './pages/UserDashboard';
import { MyFilesPage } from './pages/MyFilesPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminLogsPage } from './pages/AdminLogsPage';
import { AdminFilesPage } from './pages/AdminFilesPage';
import { SecurityLabPage } from './pages/SecurityLabPage';
import { ProjectExplorerPage } from './pages/ProjectExplorerPage';
import { ErrorPages } from './pages/ErrorPages';

function MainApp() {
  const { user, token, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [inspectedFile, setInspectedFile] = useState<VaultFile | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const addToast = useCallback(
    (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastMessage = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Secure download handler: calls authenticated backend, receives decrypted binary payload
  const handleDownloadFile = async (file: VaultFile) => {
    if (!token) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        description: 'Please authenticate to download vaulted files.',
      });
      return;
    }

    addToast({
      type: 'info',
      title: 'Decryption In Progress',
      description: `Authorizing access & checking AES-256-GCM authentication tag for '${file.original_filename}'...`,
    });

    try {
      const res = await fetch(`/api/files/download/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Download failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      a.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'File Decrypted & Delivered',
        description: `Verified GCM MAC tag and SHA-256 integrity for '${file.original_filename}'.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Cryptographic Failure',
        description: err.message,
      });
    }
  };

  // Redirect if user logs in or out
  const handleSelectTab = (tab: string) => {
    // Admin route protection
    if (tab.startsWith('admin') && user?.role !== 'admin') {
      setCurrentTab('error-403');
      return;
    }
    setCurrentTab(tab);
  };

  // Default redirect when user state changes
  React.useEffect(() => {
    if (!isLoading) {
      if (user && (currentTab === 'landing' || currentTab === 'login' || currentTab === 'register')) {
        setCurrentTab('dashboard');
      } else if (!user && currentTab !== 'project' && currentTab !== 'login' && currentTab !== 'register') {
        setCurrentTab('landing');
      }
    }
  }, [user, isLoading]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar for Authenticated Users */}
        {user && <Sidebar currentTab={currentTab} onSelectTab={handleSelectTab} />}

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'landing' && <LandingPage onSelectTab={handleSelectTab} />}

          {currentTab === 'login' && (
            <AuthPages
              initialView="login"
              onSuccess={() => setCurrentTab('dashboard')}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'register' && (
            <AuthPages
              initialView="register"
              onSuccess={() => setCurrentTab('dashboard')}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'dashboard' && (
            <UserDashboard
              key={refreshKey}
              onSelectTab={handleSelectTab}
              onOpenUpload={() => setIsUploadOpen(true)}
              onInspectFile={(f) => setInspectedFile(f)}
              onDownloadFile={handleDownloadFile}
            />
          )}

          {currentTab === 'files' && (
            <MyFilesPage
              key={refreshKey}
              onOpenUpload={() => setIsUploadOpen(true)}
              onInspectFile={(f) => setInspectedFile(f)}
              onDownloadFile={handleDownloadFile}
              onAddToast={addToast}
            />
          )}

          {currentTab === 'activity' && <ActivityLogsPage key={refreshKey} />}

          {currentTab === 'profile' && <ProfilePage onAddToast={addToast} />}

          {currentTab === 'security-lab' && (
            <SecurityLabPage
              onAddToast={addToast}
              onRefreshDashboard={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {currentTab === 'project' && <ProjectExplorerPage onAddToast={addToast} />}

          {/* Admin Tabs */}
          {currentTab === 'admin-dashboard' && <AdminDashboard onSelectTab={handleSelectTab} />}
          {currentTab === 'admin-users' && <AdminUsersPage onAddToast={addToast} />}
          {currentTab === 'admin-logs' && <AdminLogsPage />}
          {currentTab === 'admin-files' && (
            <AdminFilesPage
              onInspectFile={(f) => setInspectedFile(f)}
              onDownloadFile={handleDownloadFile}
              onAddToast={addToast}
            />
          )}

          {/* Error Views */}
          {currentTab === 'error-403' && (
            <ErrorPages code={403} onGoHome={() => setCurrentTab('dashboard')} />
          )}
          {currentTab === 'error-404' && (
            <ErrorPages code={404} onGoHome={() => setCurrentTab('dashboard')} />
          )}
          {currentTab === 'error-500' && (
            <ErrorPages code={500} onGoHome={() => setCurrentTab('dashboard')} />
          )}
        </main>
      </div>

      {/* Global Security Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        token={token}
        onUploadSuccess={() => setRefreshKey((k) => k + 1)}
        onAddToast={addToast}
      />

      {/* Cryptographic Inspector Modal */}
      <FileDetailsModal
        isOpen={!!inspectedFile}
        file={inspectedFile}
        onClose={() => setInspectedFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* Security Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

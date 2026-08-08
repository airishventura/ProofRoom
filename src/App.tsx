import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import { FeedbackProvider } from './context/FeedbackContext';
import Layout from './components/Layout';
import HomePage from './pages/Home';
import WorkspacePage from './pages/Workspace';
import AuditPage from './pages/Audit';
import PublishPage from './pages/Publish';
import ApprovalsPage from './pages/Approvals';
import LoginPage from './pages/Login';
import PublicReportPage from './pages/PublicReport';

/** Vite BASE_URL always ends with `/`; React Router basename must not (except root). */
function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/') return undefined;
  return base.replace(/\/$/, '');
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <RoomProvider>
        <FeedbackProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/publish" element={<PublishPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/r/:roomId" element={<PublicReportPage />} />
            </Route>
          </Routes>
        </FeedbackProvider>
      </RoomProvider>
    </BrowserRouter>
  );
}


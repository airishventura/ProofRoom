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

/**
 * Map Vite BASE_URL → React Router basename.
 * Root / relative bases (`/`, `./`, `.`) must be undefined — otherwise RR gets
 * basename "/." and matches nothing (white screen).
 * Only absolute subpaths (e.g. `/ProofRoom`) get a basename.
 */
function routerBasename(): string | undefined {
  const base = (import.meta.env.BASE_URL || '/').trim();
  if (!base || base === '/' || base === './' || base === '.') return undefined;
  const stripped = base.replace(/\/+$/, '');
  if (!stripped || stripped === '.' || stripped === './') return undefined;
  if (!stripped.startsWith('/')) return undefined;
  return stripped;
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


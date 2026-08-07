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

export default function App() {
  return (
    <BrowserRouter>
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

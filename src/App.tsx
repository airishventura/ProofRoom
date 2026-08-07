import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import WorkspacePage from './pages/Workspace';
import AuditPage from './pages/Audit';
import PublishPage from './pages/Publish';
import ApprovalsPage from './pages/Approvals';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

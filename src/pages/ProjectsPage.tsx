import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { ProjectList } from '../components/ProjectList';
import { ProjectUpload } from '../components/ProjectUpload';
import { useAppData } from '../contexts/AppDataContext';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, refreshProjectsAndStats } = useAppData();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-xl border border-slate-700/70 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Projects</h2>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition"
          >
            <Upload className="w-4 h-4" />
            <span>{showUpload ? 'Close Upload' : 'Upload CAD Model'}</span>
          </button>
        </div>

        {showUpload ? (
          <ProjectUpload
            onClose={() => setShowUpload(false)}
            onProjectCreated={async () => {
              setShowUpload(false);
              await refreshProjectsAndStats();
            }}
          />
        ) : (
          <ProjectList
            projects={projects}
            onSelectProject={(project) => navigate(`/projects/${project.id}`)}
          />
        )}
      </div>
    </div>
  );
}

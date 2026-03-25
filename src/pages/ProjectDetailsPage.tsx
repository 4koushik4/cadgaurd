import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectDetails } from '../components/ProjectDetails';
import { useAppData } from '../contexts/AppDataContext';

export function ProjectDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { projects, refreshProjectsAndStats, loading } = useAppData();

  const project = useMemo(() => projects.find((item) => item.id === id) || null, [projects, id]);

  if (loading) {
    return <p className="text-slate-300">Loading project...</p>;
  }

  if (!project) {
    return (
      <div className="glass-card rounded-xl border border-rose-400/25 p-6">
        <h2 className="text-lg font-semibold text-rose-200 mb-2">Project not found</h2>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <ProjectDetails
      project={project}
      onBack={() => navigate('/projects')}
      onUpdate={refreshProjectsAndStats}
    />
  );
}

import { FileText, Calendar, TrendingUp } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  file_format: string;
  file_url: string;
  quality_score: number;
  status: string;
  created_at: string;
}

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export function ProjectList({ projects, onSelectProject }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-cyan-300/70 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-100 mb-2">No projects yet</h3>
        <p className="text-cyan-200/80">Upload your first CAD model to get started</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/35';
      case 'processing':
        return 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/35';
      case 'failed':
        return 'bg-rose-500/20 text-rose-200 border border-rose-400/35';
      default:
        return 'bg-slate-700/30 text-slate-200 border border-slate-500/30';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-300';
    if (score >= 60) return 'text-amber-300';
    return 'text-rose-300';
  };

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onSelectProject(project)}
          className="glass-card rounded-lg p-6 border border-cyan-400/20 hover:border-cyan-300/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.22)] transition cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-100">{project.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-700/35 text-slate-200 border border-slate-500/35">
                  {project.file_format.toUpperCase()}
                </span>
              </div>
              {project.description && (
                <p className="text-slate-300 text-sm mb-3">{project.description}</p>
              )}
              <div className="flex items-center space-x-6 text-sm text-cyan-100/80">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className={`font-semibold ${getQualityColor(project.quality_score)}`}>
                    Quality: {project.quality_score}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

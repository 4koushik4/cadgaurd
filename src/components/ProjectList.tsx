import { FileText, Calendar, TrendingUp } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  file_format: string;
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
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No projects yet</h3>
        <p className="text-slate-600">Upload your first CAD model to get started</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onSelectProject(project)}
          className="border border-slate-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {project.file_format.toUpperCase()}
                </span>
              </div>
              {project.description && (
                <p className="text-slate-600 text-sm mb-3">{project.description}</p>
              )}
              <div className="flex items-center space-x-6 text-sm text-slate-600">
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

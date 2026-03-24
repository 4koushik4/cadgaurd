import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Upload,
  FolderOpen,
  Activity,
  AlertTriangle,
  CheckCircle,
  LogOut,
  Zap,
  FileText,
  Settings
} from 'lucide-react';
import { ProjectList } from './ProjectList';
import { ProjectUpload } from './ProjectUpload';
import { ProjectDetails } from './ProjectDetails';

interface Project {
  id: string;
  name: string;
  description: string;
  file_format: string;
  quality_score: number;
  status: string;
  created_at: string;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeValidations: 0,
    criticalIssues: 0,
    avgQualityScore: 0
  });

  useEffect(() => {
    loadProjects();
    loadStats();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('quality_score, status');

      const { data: issuesData } = await supabase
        .from('issues')
        .select('severity')
        .eq('severity', 'critical')
        .eq('status', 'open');

      if (projectsData) {
        const avgScore = projectsData.reduce((acc, p) => acc + (p.quality_score || 0), 0) /
                        (projectsData.length || 1);

        setStats({
          totalProjects: projectsData.length,
          activeValidations: projectsData.filter(p => p.status === 'processing').length,
          criticalIssues: issuesData?.length || 0,
          avgQualityScore: Math.round(avgScore)
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleProjectCreated = () => {
    setShowUpload(false);
    loadProjects();
    loadStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">CADGuard AI</h1>
                <p className="text-sm text-slate-600">Intelligent Design Validation</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-600">Signed in as</p>
                <p className="text-sm font-medium text-slate-900">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <FolderOpen className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalProjects}</p>
            <p className="text-sm text-slate-600">Total Projects</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.activeValidations}</p>
            <p className="text-sm text-slate-600">Active Validations</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.criticalIssues}</p>
            <p className="text-sm text-slate-600">Critical Issues</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.avgQualityScore}%</p>
            <p className="text-sm text-slate-600">Avg Quality Score</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Your Projects</h2>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CAD Model</span>
            </button>
          </div>

          {showUpload ? (
            <ProjectUpload
              onClose={() => setShowUpload(false)}
              onProjectCreated={handleProjectCreated}
            />
          ) : selectedProject ? (
            <ProjectDetails
              project={selectedProject}
              onBack={() => setSelectedProject(null)}
              onUpdate={loadProjects}
            />
          ) : (
            <ProjectList
              projects={projects}
              onSelectProject={setSelectedProject}
            />
          )}
        </div>
      </main>
    </div>
  );
}

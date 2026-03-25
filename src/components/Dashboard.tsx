import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Upload,
  FolderOpen,
  Activity,
  AlertTriangle,
  CheckCircle,
  LogOut,
  Zap
} from 'lucide-react';
import { ProjectList } from './ProjectList';
import { ProjectUpload } from './ProjectUpload';
import { ProjectDetails } from './ProjectDetails';
import { VersionComparison } from './VersionComparison';

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

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeValidationDelta, setActiveValidationDelta] = useState(0);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeValidations: 0,
    criticalIssues: 0,
    avgQualityScore: 0
  });

  useEffect(() => {
    loadProjects();
    loadStats();

    const channel = supabase
      .channel('dashboard-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadProjects();
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validations' }, () => {
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      const { data: validationsData } = await supabase
        .from('validations')
        .select('id, status')
        .in('status', ['running', 'queued', 'processing']);

      const { data: issuesData } = await supabase
        .from('issues')
        .select('severity')
        .eq('severity', 'high')
        .eq('status', 'open');

      if (projectsData) {
        const avgScore = projectsData.reduce((acc, p) => acc + (p.quality_score || 0), 0) /
                        (projectsData.length || 1);

        setStats({
          totalProjects: projectsData.length,
          activeValidations: validationsData?.length || 0,
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

  const handleValidationActivityChange = (delta: number) => {
    setActiveValidationDelta((current) => Math.max(0, current + delta));
  };

  const activeValidationCount = Math.max(0, stats.activeValidations + activeValidationDelta);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-grid">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-grid">
      <header className="bg-slate-950/70 border-b border-cyan-500/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-cyan-500/20 border border-cyan-300/50 p-2 rounded-lg pulse-glow">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CADGuard AI</h1>
                <p className="text-sm text-cyan-200">Intelligent Design Validation</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">Signed in as</p>
                <p className="text-sm font-medium text-slate-100">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-slate-100 border border-fuchsia-400/35 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 rounded-lg transition"
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="glass-card neon-border-cyan rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <FolderOpen className="w-8 h-8 text-cyan-300" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
            <p className="text-sm text-slate-300">Total Projects</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="glass-card neon-border-purple rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-violet-300" />
            </div>
            <p className="text-3xl font-bold text-white">{activeValidationCount}</p>
            <p className="text-sm text-slate-300">Active Validations</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="glass-card neon-border-pink rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-pink-300" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.criticalIssues}</p>
            <p className="text-sm text-slate-300">High Severity Issues</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }} className="glass-card border border-emerald-400/30 rounded-xl p-6 shadow-[0_0_22px_rgba(52,211,153,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-emerald-300" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.avgQualityScore}%</p>
            <p className="text-sm text-slate-300">Avg Quality Score</p>
          </motion.div>
        </div>

        <div className="glass-card rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Your Projects</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowComparison((v) => !v)}
                className="px-4 py-2 rounded-lg border border-violet-400/40 text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 transition"
              >
                {showComparison ? 'Hide Version Compare' : 'Compare Versions'}
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center space-x-2 bg-cyan-500/20 hover:bg-cyan-400/30 text-cyan-200 border border-cyan-400/40 px-4 py-2 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CAD Model</span>
              </button>
            </div>
          </div>

          {showComparison && (
            <div className="mb-6">
              <VersionComparison projects={projects} />
            </div>
          )}

          {showUpload ? (
            <ProjectUpload
              onClose={() => setShowUpload(false)}
              onProjectCreated={handleProjectCreated}
              onValidationActivityChange={handleValidationActivityChange}
            />
          ) : selectedProject ? (
            <ProjectDetails
              project={selectedProject}
              onBack={() => setSelectedProject(null)}
              onValidationActivityChange={handleValidationActivityChange}
              onUpdate={() => {
                loadProjects();
                loadStats();
              }}
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

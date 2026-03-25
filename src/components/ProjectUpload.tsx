import { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { runBackendValidation } from '../lib/backendApi';

interface ProjectUploadProps {
  onClose: () => void;
  onProjectCreated: () => void;
  onValidationActivityChange?: (delta: number) => void;
}

export function ProjectUpload({ onClose, onProjectCreated, onValidationActivityChange }: ProjectUploadProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [runValidationNow, setRunValidationNow] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['stl', 'step', 'obj', 'stp'].includes(fileExt || '')) {
        setError('Please upload a valid CAD file (.stl, .step, .obj)');
        return;
      }
      setFile(selectedFile);
      setError('');
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) {
      setError('Please provide a name and select a file');
      return;
    }

    setLoading(true);
    setError('');
    let startedImmediateValidation = false;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;
      const filePath = `${userData.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cad-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cad-files')
        .getPublicUrl(filePath);

      const { data: projectRecord, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: userData.user.id,
          name,
          description,
          file_format: fileExt,
          file_url: publicUrl,
          file_path: filePath,
          file_size: file.size,
          status: 'uploaded',
          quality_score: 0,
          metadata: {
            upload_name: file.name,
            source: 'web-upload',
          }
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (runValidationNow && projectRecord?.id) {
        startedImmediateValidation = true;
        onValidationActivityChange?.(1);
        await supabase
          .from('projects')
          .update({ status: 'processing' })
          .eq('id', projectRecord.id);

        const validationPayload = await runBackendValidation(publicUrl, fileExt);

        const { data: validationRow } = await supabase
          .from('validations')
          .insert({
            project_id: projectRecord.id,
            validation_type: 'fastapi_hybrid',
            status: 'completed',
            total_issues: validationPayload.summary.total_issues,
            critical_issues: validationPayload.summary.high_issues,
            warnings: validationPayload.summary.high_issues + validationPayload.summary.medium_issues,
            info_count: validationPayload.summary.low_issues,
            execution_time: 1.0,
          })
          .select('id')
          .single();

        if (validationRow && validationPayload.validation_issues.length > 0) {
          await supabase.from('issues').insert(
            validationPayload.validation_issues.map((issue) => ({
              validation_id: validationRow.id,
              project_id: projectRecord.id,
              rule_id: issue.rule_id,
              severity: issue.severity,
              category: issue.rule_id.toLowerCase().includes('geometry') ? 'geometry' : 'structural',
              title: issue.rule_id.replace(/_/g, ' '),
              description: issue.explanation,
              measured_value: issue.measured_value ?? null,
              expected_value: issue.expected_value ?? null,
              unit: issue.unit ?? '',
              location: {},
              ai_explanation: validationPayload.ai_insight.explanation,
              ai_suggestion: validationPayload.ai_insight.suggestions.join(' '),
              status: 'open',
            }))
          );
        }

        await supabase
          .from('projects')
          .update({
            status: 'completed',
            quality_score: validationPayload.summary.quality_score,
          })
          .eq('id', projectRecord.id);

        onValidationActivityChange?.(-1);
      }

      onProjectCreated();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to upload project');
      if (startedImmediateValidation) {
        onValidationActivityChange?.(-1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-700 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-100">Upload New Project</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/15 border border-red-400/40 text-red-100 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-cyan-400/30 bg-slate-950/60 text-slate-100 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            placeholder="Enter project name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-fuchsia-400/30 bg-slate-950/60 text-slate-100 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent outline-none"
            placeholder="Optional project description"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            CAD File * (.stl, .step, .obj)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-cyan-400/35 bg-slate-900/50 rounded-lg p-8 text-center hover:border-cyan-300/70 transition cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".stl,.step,.obj,.stp"
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="w-8 h-8 text-cyan-300" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-100">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-cyan-300/80 mx-auto mb-3" />
                <p className="text-slate-100 font-medium mb-1">Click to upload CAD file</p>
                <p className="text-slate-400 text-sm">STL, STEP, or OBJ format</p>
              </>
            )}
          </div>
        </div>

        <label className="flex items-center space-x-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={runValidationNow}
            onChange={(e) => setRunValidationNow(e.target.checked)}
            className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500"
          />
          <span>Run validation immediately after upload (real-time feedback)</span>
        </label>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !file || !name}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500/70 via-violet-500/60 to-fuchsia-500/70 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(0,240,255,0.2)]"
          >
            {loading ? 'Uploading...' : 'Upload Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

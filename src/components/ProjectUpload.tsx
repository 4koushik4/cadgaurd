import { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProjectUploadProps {
  onClose: () => void;
  onProjectCreated: () => void;
}

export function ProjectUpload({ onClose, onProjectCreated }: ProjectUploadProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `cad-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('projects')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('projects')
        .getPublicUrl(filePath);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: userData.user.id,
          name,
          description,
          file_format: fileExt,
          file_url: publicUrl,
          file_size: file.size,
          status: 'uploaded',
          quality_score: 0,
          metadata: {}
        });

      if (insertError) throw insertError;

      onProjectCreated();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to upload project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Upload New Project</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Enter project name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Optional project description"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            CAD File * (.stl, .step, .obj)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer"
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
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 font-medium mb-1">Click to upload CAD file</p>
                <p className="text-slate-500 text-sm">STL, STEP, or OBJ format</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !file || !name}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : 'Upload Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

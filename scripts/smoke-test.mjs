import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
  );
}

const env = loadEnv('.env');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

const supabase = createClient(url, anonKey);

const email = `smoke_${Date.now()}_${Math.floor(Math.random() * 10000)}@cadguard.test`;
const password = `Cg!${Math.random().toString(36).slice(2)}A9`;

console.log('Smoke user:', email);

const signUpRes = await supabase.auth.signUp({ email, password });
if (signUpRes.error) {
  throw new Error(`Sign up failed: ${signUpRes.error.message}`);
}

let session = signUpRes.data.session;
if (!session) {
  const signInRes = await supabase.auth.signInWithPassword({ email, password });
  if (signInRes.error) {
    throw new Error(`User created but sign-in failed (likely email confirmation required): ${signInRes.error.message}`);
  }
  session = signInRes.data.session;
}

if (!session?.access_token) {
  throw new Error('No access token available for smoke test');
}

await supabase.auth.setSession({
  access_token: session.access_token,
  refresh_token: session.refresh_token
});

console.log('Access token prefix:', session.access_token.slice(0, 20));

console.log('Auth OK');

const { data: project, error: projectError } = await supabase
  .from('projects')
  .insert({
    user_id: session.user.id,
    name: `Smoke Test ${new Date().toISOString()}`,
    description: 'Automated smoke test project',
    file_format: 'stl',
    file_url: 'https://example.com/smoke-test.stl',
    file_path: `${session.user.id}/smoke-test.stl`,
    file_size: 2048,
    status: 'uploaded',
    quality_score: 0,
    metadata: {
      wall_thickness: 1.2,
      hole_spacing: 3.5,
      draft_angle: 1.0,
      min_fillet_radius: 0.6,
      clearance: -0.1,
      stress_index: 1.25,
      undercuts: true,
      faces: 120,
      edges: 240,
      holes: 8,
      surfaces: 120
    }
  })
  .select('id, name')
  .single();

if (projectError || !project) {
  throw new Error(`Project insert failed: ${projectError?.message}`);
}

console.log('Project created:', project.id);

async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, {
    body
  });

  if (error) {
    throw new Error(`${name} failed: ${error.message} | details=${JSON.stringify(error)}`);
  }

  console.log(`${name} OK`, data);
  return data;
}

const validation = await callFunction('validate-design', { projectId: project.id });
const simulation = await callFunction('run-simulation', { projectId: project.id, materialType: 'steel_1045', force: 1600 });
const ai = await callFunction('ai-analysis', { validationId: validation.validationId, useAI: true });
const report = await callFunction('generate-report', { projectId: project.id, format: 'pdf' });

const [issuesRes, validationsRes, simulationsRes, reportsRes] = await Promise.all([
  supabase.from('issues').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
  supabase.from('validations').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
  supabase.from('simulation_results').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
  supabase.from('reports').select('id', { count: 'exact', head: true }).eq('project_id', project.id)
]);

console.log('DB verification:', {
  validations: validationsRes.count,
  issues: issuesRes.count,
  simulations: simulationsRes.count,
  reports: reportsRes.count
});

console.log('Smoke test PASSED', {
  projectId: project.id,
  validationId: validation.validationId,
  simulationId: simulation.simulationId,
  reportId: report.reportId,
  reportUrl: report.reportUrl,
  aiProcessed: ai.processedIssues
});

# CADGuard AI - Deployment Guide

Complete deployment guide for setting up CADGuard AI in production.

## Prerequisites

Before deploying, ensure you have:
- Supabase account (free tier works for testing)
- Node.js 18+ installed locally
- Git installed
- OpenAI API key (optional, system works without it)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - Name: CADGuard-AI
   - Database Password: (generate strong password)
   - Region: (choose closest to your users)
5. Wait for project to be provisioned (~2 minutes)

### 1.2 Get Supabase Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUz...` (long string)
   - **Service Role Key**: `eyJhbGciOiJIUz...` (different long string)

### 1.3 Run Database Migrations

The database schema has already been created via the migration system. Verify it:

1. Go to Table Editor in Supabase dashboard
2. Confirm these tables exist:
   - projects
   - validations
   - issues
   - simulation_results
   - design_history
   - reports

### 1.4 Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Click "Create bucket"
3. Name: `projects`
4. Public bucket: Yes
5. Click "Create bucket"

### 1.5 Set Storage Policies

1. Click on the `projects` bucket
2. Go to "Policies" tab
3. Add policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'projects');

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own project files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'projects');
```

## Step 2: Configure Environment Variables

### 2.1 Create .env File

In your project root, update the `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_OPENAI_API_KEY=your_openai_key_here
```

Replace the values with:
- **VITE_SUPABASE_URL**: Your Project URL from step 1.2
- **VITE_SUPABASE_ANON_KEY**: Your Anon/Public Key from step 1.2
- **VITE_OPENAI_API_KEY**: Your OpenAI API key (optional)

### 2.2 Configure Edge Function Secrets (Optional)

If you want to use AI features:

1. The OpenAI API key is automatically available to Edge Functions
2. No manual configuration needed

## Step 3: Edge Functions Deployment

The Edge Functions have already been deployed. To verify:

1. Go to Edge Functions in Supabase dashboard
2. Confirm these functions are deployed:
   - validate-design
   - run-simulation
   - ai-analysis

To redeploy if needed, the system handles this automatically.

## Step 4: Frontend Deployment

### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY` (optional)
7. Click "Deploy"

### Option B: Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Select your GitHub repository
5. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in Site settings → Environment variables
7. Click "Deploy"

### Option C: Static Hosting

1. Build the project:
```bash
npm run build
```

2. Upload the `dist` folder to any static hosting:
   - AWS S3 + CloudFront
   - Google Cloud Storage
   - Azure Static Web Apps
   - GitHub Pages

## Step 5: Post-Deployment Verification

### 5.1 Test Authentication

1. Open your deployed URL
2. Click "Sign up"
3. Create a test account
4. Verify you can sign in

### 5.2 Test Project Upload

1. Sign in to your account
2. Click "Upload CAD Model"
3. Upload a test file (any .stl, .step, or .obj file)
4. Verify file appears in projects list

### 5.3 Test Validation

1. Select your uploaded project
2. Click "Run Validation"
3. Wait a few seconds
4. Verify validation results appear
5. Check that AI explanations are shown (if OpenAI is configured)

### 5.4 Test Simulation

1. In project details, click "Run Simulation"
2. Wait for completion
3. Verify simulation results display
4. Check stress, displacement, and safety factor

## Step 6: Production Configuration

### 6.1 Email Authentication (Optional)

To enable email confirmations:

1. Go to Authentication → Settings in Supabase
2. Configure SMTP settings or use Supabase's email service
3. Update email templates as needed

### 6.2 Custom Domain (Optional)

For Vercel:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed

For Netlify:
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS as instructed

### 6.3 Enable HTTPS

Most platforms (Vercel, Netlify) provide automatic HTTPS. Verify:
1. Your site loads with `https://`
2. No mixed content warnings
3. Valid SSL certificate

## Step 7: Monitoring & Maintenance

### 7.1 Monitor Supabase Usage

1. Check Database size in Supabase dashboard
2. Monitor Edge Function invocations
3. Review Storage usage
4. Check API request counts

### 7.2 Monitor Application Errors

Set up error tracking:
1. Add Sentry or similar error tracking
2. Monitor console errors in production
3. Set up alerts for critical issues

### 7.3 Performance Monitoring

1. Use Lighthouse for performance audits
2. Monitor Core Web Vitals
3. Check bundle size regularly
4. Optimize images and assets

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**: Ensure `.env` file has correct values and is loaded properly. For production, add environment variables in your hosting platform.

### Issue: Authentication not working

**Solution**:
1. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
2. Verify Supabase project is active
3. Check browser console for CORS errors

### Issue: File upload fails

**Solution**:
1. Verify storage bucket `projects` exists
2. Check storage policies are set correctly
3. Ensure user is authenticated
4. Check file size limits

### Issue: Validation doesn't run

**Solution**:
1. Verify Edge Functions are deployed
2. Check Supabase Edge Function logs
3. Ensure project exists in database
4. Verify user has access to the project

### Issue: AI explanations not showing

**Solution**:
1. Check if OPENAI_API_KEY is set (optional)
2. System should show fallback explanations
3. Check Edge Function logs for errors
4. Verify ai-analysis function is deployed

### Issue: Large bundle size warning

**Solution**: This is expected due to Three.js library. To optimize:
1. Consider lazy loading Three.js components
2. Use dynamic imports
3. Enable code splitting in Vite config

## Security Checklist

- [ ] All environment variables set correctly
- [ ] Row Level Security enabled on all tables
- [ ] Storage bucket policies configured
- [ ] HTTPS enabled
- [ ] CORS headers properly set
- [ ] No sensitive keys in frontend code
- [ ] Authentication working properly
- [ ] Password requirements enforced

## Performance Checklist

- [ ] Build completes successfully
- [ ] No console errors on production site
- [ ] Images optimized
- [ ] Lazy loading implemented where appropriate
- [ ] Lighthouse score > 90
- [ ] Fast Time to Interactive
- [ ] Minimal JavaScript bundle size

## Production-Ready Checklist

- [ ] Database schema deployed
- [ ] Storage bucket created
- [ ] Edge Functions deployed
- [ ] Frontend deployed
- [ ] Environment variables configured
- [ ] Authentication tested
- [ ] File upload tested
- [ ] Validation tested
- [ ] Simulation tested
- [ ] 3D viewer tested
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] Error handling in place
- [ ] Loading states implemented

## Scaling Considerations

### Database Scaling
- Monitor connection pool usage
- Add read replicas if needed
- Consider database sharding for large scale

### Edge Functions Scaling
- Monitor invocation counts
- Optimize function cold starts
- Consider caching for frequently accessed data

### Frontend Scaling
- Use CDN for static assets
- Enable caching headers
- Consider multi-region deployment

## Cost Optimization

### Supabase Free Tier Limits
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 500K Edge Function invocations/month

### Upgrade When:
- Database exceeds 500 MB
- Monthly users exceed free tier
- Need better performance
- Require more storage

## Support Resources

- Supabase Documentation: https://supabase.com/docs
- React Documentation: https://react.dev
- Three.js Documentation: https://threejs.org/docs
- Vite Documentation: https://vitejs.dev
- OpenAI API Documentation: https://platform.openai.com/docs

## Next Steps

After successful deployment:

1. Add sample CAD models for demo
2. Create user documentation
3. Set up analytics tracking
4. Implement feedback collection
5. Plan feature enhancements
6. Set up automated backups
7. Create disaster recovery plan

Congratulations! Your CADGuard AI system is now deployed and ready for production use.

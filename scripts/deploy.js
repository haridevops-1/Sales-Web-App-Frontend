import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

async function deploy() {
  console.log('🚀 Preparing deployment for Zoho Catalyst (Spikra-AI-Proposal)...');

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory does not exist. Please run "npm run build" first.');
    process.exit(1);
  }

  // Ensure client-package.json exists in dist
  const clientPkg = {
    name: 'internal-sales-app',
    version: '1.0.0',
    homepage: 'index.html'
  };
  fs.writeFileSync(path.join(distDir, 'client-package.json'), JSON.stringify(clientPkg, null, 2));

  // Ensure 404.html exists for client-side routing
  fs.copyFileSync(path.join(distDir, 'index.html'), path.join(distDir, '404.html'));

  // Ensure static route folders exist with index.html for direct URL access on Slate & static hosts
  const staticRoutes = [
    'workspace',
    'proposals',
    path.join('proposals', 'create'),
    'showcases',
    path.join('showcases', 'create')
  ];

  for (const routePath of staticRoutes) {
    const targetFolder = path.join(distDir, routePath);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    fs.copyFileSync(path.join(distDir, 'index.html'), path.join(targetFolder, 'index.html'));
  }

  // Create temporary zip archive using native zip
  const tempZip = path.join(projectRoot, '.deploy.zip');
  if (fs.existsSync(tempZip)) {
    fs.unlinkSync(tempZip);
  }

  execSync(`cd "${distDir}" && zip -rq "${tempZip}" .`);
  console.log(`📦 Packaged deployment archive (${(fs.statSync(tempZip).size / 1024).toFixed(1)} KB)`);

  // Use Catalyst CLI library for authentication & upload
  const cliLib = '/Users/hariharan/.npm/_npx/5ae67a3bbbb048b8/node_modules/zcatalyst-cli/lib';
  const auth = require(path.join(cliLib, 'command_needs/auth.js')).default;
  const API = require(path.join(cliLib, 'internal/api.js')).default;

  auth();

  const org = '698386704';

  // Primary project: Spikra-AI-Proposal (where all functions and tables live)
  const targets = [
    {
      name: 'Spikra-AI-Proposal',
      projectId: '822000000769001',
      envId: '822000000769018',
      liveUrl: 'https://spikra-ai-proposal-698386704.development.catalystserverless.com/app/index.html'
    },
    {
      name: 'Internal-Sales-App',
      projectId: '822000000782003',
      envId: '822000000782020',
      liveUrl: 'https://internal-sales-app-698386704.development.catalystserverless.com/app/'
    }
  ];

  for (const target of targets) {
    console.log(`\n📡 Uploading to Zoho Catalyst Web Client (${target.name} - ${target.projectId})...`);
    const headers = {
      'CATALYST-ORG': org,
      'CATALYST-PROJECT': target.projectId,
      'CATALYST-ENV': target.envId
    };

    const api = new API({ headers, authNeeded: true });

    try {
      const stream = fs.createReadStream(tempZip);
      await api.post(`/baas/v1/project/${target.projectId}/webapp`, {
        formData: { app_zip: stream },
        json: false
      });
      console.log(`✅ Successfully deployed to Zoho Catalyst under ${target.name}!`);
      console.log(`🌐 Live Application URL: ${target.liveUrl}`);
    } catch (err) {
      console.error(`⚠️ Deployment warning for ${target.name}:`, err.status, err.message);
    }
  }

  // Cleanup temp zip
  if (fs.existsSync(tempZip)) {
    fs.unlinkSync(tempZip);
  }
  console.log('\n🎉 Deployment process finished!\n');
}

deploy();

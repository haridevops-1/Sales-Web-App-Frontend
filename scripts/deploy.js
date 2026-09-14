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
  console.log('🚀 Preparing deployment for Zoho Catalyst (Internal-Sales-App)...');

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

  const projectId = '822000000782003';
  const org = '698386704';
  const envId = '822000000782020';

  const headers = {
    'CATALYST-ORG': org,
    'CATALYST-PROJECT': projectId,
    'CATALYST-ENV': envId
  };

  const api = new API({ headers, authNeeded: true });
  console.log('📡 Uploading to Zoho Catalyst Web Client...');

  try {
    const stream = fs.createReadStream(tempZip);
    const res = await api.post(`/baas/v1/project/${projectId}/webapp`, {
      formData: { app_zip: stream },
      json: false
    });

    // Cleanup temp zip
    if (fs.existsSync(tempZip)) {
      fs.unlinkSync(tempZip);
    }

    console.log('\n✅ Successfully deployed to Zoho Catalyst under Internal-Sales-App!');
    console.log('🌐 Live Application URL:');
    console.log('   https://internal-sales-app-698386704.development.catalystserverless.com/app/\n');
  } catch (err) {
    if (fs.existsSync(tempZip)) {
      fs.unlinkSync(tempZip);
    }
    console.error('❌ Deployment failed:', err.status, err.message);
    process.exit(1);
  }
}

deploy();

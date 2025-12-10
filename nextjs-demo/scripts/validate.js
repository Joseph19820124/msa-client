// Simple validation script to check file structure and basic syntax
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'package.json',
  'next.config.js', 
  'tsconfig.json',
  'pages/_app.tsx',
  'pages/index.tsx',
  'components/PostCreate.tsx',
  'components/PostList.tsx',
  'components/CommentCreate.tsx',
  'components/CommentList.tsx',
  'hooks/useApi.ts',
  'lib/api.ts',
  'styles/globals.css',
  'README.md'
];

console.log('🔍 Validating Next.js demo structure...\n');

let allValid = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    console.log(`✅ ${file} (${stat.size} bytes)`);
  } else {
    console.log(`❌ ${file} - Missing!`);
    allValid = false;
  }
});

// Check package.json for correct dependencies
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  
  console.log('\n📦 Dependencies check:');
  const requiredDeps = ['next', 'react', 'react-dom', 'axios'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - Missing!`);
      allValid = false;
    }
  });

  console.log('\n🛠️  Scripts check:');
  const requiredScripts = ['dev', 'build', 'start'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
    } else {
      console.log(`❌ ${script} - Missing!`);
      allValid = false;
    }
  });
} catch (err) {
  console.log('❌ Error reading package.json:', err.message);
  allValid = false;
}

console.log(`\n${allValid ? '🎉' : '❌'} Validation ${allValid ? 'passed' : 'failed'}!`);
process.exit(allValid ? 0 : 1);
const fs = require('fs');
const path = require('path');

function replaceColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/bg-white/g, 'bg-card text-card-foreground');
  content = content.replace(/bg-gray-50\/80/g, 'bg-muted/80');
  content = content.replace(/bg-gray-50\/50/g, 'bg-muted/50');
  content = content.replace(/bg-gray-50/g, 'bg-muted');
  content = content.replace(/bg-gray-100/g, 'bg-muted/50');
  
  content = content.replace(/text-gray-900/g, 'text-card-foreground');
  content = content.replace(/text-gray-800/g, 'text-foreground');
  content = content.replace(/text-gray-500/g, 'text-muted-foreground');
  content = content.replace(/text-gray-600/g, 'text-muted-foreground');
  content = content.replace(/text-gray-400/g, 'text-muted-foreground');
  
  content = content.replace(/border-gray-100/g, 'border-border');
  content = content.replace(/border-gray-200/g, 'border-border');
  content = content.replace(/border-gray-50/g, 'border-border');
  
  content = content.replace(/divide-gray-100/g, 'divide-border');
  content = content.replace(/divide-gray-50/g, 'divide-border');
  
  content = content.replace(/ring-gray-100\/50/g, 'ring-border/50');
  content = content.replace(/ring-gray-100/g, 'ring-border');
  
  // Fix the double classes if any
  content = content.replace(/text-card-foreground text-card-foreground/g, 'text-card-foreground');
  content = content.replace(/bg-card text-card-foreground text-card-foreground/g, 'bg-card text-card-foreground');
  
  fs.writeFileSync(filePath, content);
}

replaceColors(path.join(__dirname, 'client/src/pages/Dashboard.tsx'));
replaceColors(path.join(__dirname, 'client/src/components/Layout.tsx'));
replaceColors(path.join(__dirname, 'client/src/App.tsx'));

const fs = require('fs');
const path = require('path');

function replaceColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Replace active/inactive mode buttons and high-contrast badges (blue)
  content = content.replace(/bg-blue-50 text-blue-700 border-blue-200/g, 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30');
  content = content.replace(/bg-blue-50 text-blue-700 border border-blue-200/g, 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/30');
  content = content.replace(/bg-blue-50 text-blue-600/g, 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400');
  content = content.replace(/bg-blue-50 hover:bg-blue-100/g, 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40');
  
  // 2. Replace active/inactive high-contrast badges (emerald & green)
  content = content.replace(/bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/g, 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/20');
  content = content.replace(/bg-emerald-50 text-emerald-700 border-emerald-200/g, 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30');
  content = content.replace(/bg-green-50 text-green-700 border-green-200 hover:bg-green-100/g, 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/20');
  content = content.replace(/bg-green-50 text-green-600/g, 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400');
  content = content.replace(/bg-green-50\/50/g, 'bg-green-50/50 dark:bg-emerald-950/20');
  
  // 3. Replace active/inactive high-contrast badges (orange & amber & rose)
  content = content.replace(/bg-orange-50 text-orange-600/g, 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400');
  content = content.replace(/bg-amber-50 text-amber-600/g, 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400');
  content = content.replace(/bg-orange-50 hover:bg-orange-100/g, 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/40');
  content = content.replace(/bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/g, 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/20');
  content = content.replace(/bg-rose-50\/80 border-b border-rose-100/g, 'bg-rose-50/80 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30');
  
  // 4. Custom hovers
  content = content.replace(/hover:bg-rose-50\/50/g, 'hover:bg-rose-50/50 dark:hover:bg-rose-950/10');
  content = content.replace(/hover:bg-emerald-50/g, 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20');
  
  // 5. Clean double active border declarations
  content = content.replace(/border border-blue-200 z-10/g, 'border border-blue-200 dark:border-blue-900/50 z-10');
  content = content.replace(/bg-blue-50 text-blue-700 border-blue-200 z-10/g, 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 z-10');
  content = content.replace(/bg-blue-50 dark:bg-blue-950\/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900\/30 z-10/g, 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 z-10');
  
  fs.writeFileSync(filePath, content);
}

const filesToRefactor = [
  'client/src/pages/Dashboard.tsx',
  'client/src/pages/Orders.tsx',
  'client/src/pages/Customers.tsx',
  'client/src/pages/Users.tsx',
  'client/src/pages/Routes.tsx',
  'client/src/pages/Login.tsx',
  'client/src/components/orders/OrderTable.tsx',
  'client/src/components/orders/OrderFormModal.tsx',
  'client/src/components/OrderMessageDialog.tsx',
  'client/src/components/OrderMessageIcon.tsx',
  'client/src/components/ui/ConfirmModal.tsx',
  'client/src/components/ErrorBoundary.tsx'
];

filesToRefactor.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    replaceColors(fullPath);
    console.log(`Polished details in: ${filePath = file}`);
  } else {
    console.warn(`File not found: ${fullPath}`);
  }
});

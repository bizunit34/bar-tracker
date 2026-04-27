const fs = require('fs');
const path = require('path');

const dispatcherPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-nitro-modules',
  'cpp',
  'threading',
  'Dispatcher.cpp',
);

if (!fs.existsSync(dispatcherPath)) {
  process.exit(0);
}

const source = fs.readFileSync(dispatcherPath, 'utf8');
const patched = source.replace(
  'std::weak_ptr(dispatcher)',
  'std::weak_ptr<Dispatcher>(dispatcher)',
);

if (patched !== source) {
  fs.writeFileSync(dispatcherPath, patched);
  console.log('Patched react-native-nitro-modules Dispatcher.cpp for Android NDK weak_ptr.');
}

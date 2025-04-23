// create_snapshot.js

import fs from 'fs'; // Use ES Module syntax (add "type": "module" to package.json if not already there)
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const config = {
  // Directories to scan relative to the script's location (project root)
  directoriesToScan: ['src', '.'], // Scan 'src' and the root directory

  // Output file name
  outputFile: 'code_snapshot.txt',

  // File extensions to include
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'],

  // Specific files to always include (relative to project root), even if not matching extensions (e.g., config files)
  // Add files like 'vite.config.js', 'tsconfig.json' if they are js/json already, otherwise add here.
  includeSpecificFiles: ['vite.config.ts', 'tsconfig.json', 'package.json', 'index.html'],

  // Directory names (not full paths) to exclude entirely
  excludeDirs: [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.vscode',
    '.idea', // Common IDE folder
    'coverage', // Common test coverage folder
    'public', // Often contains static assets, not source code logic
  ],

  // Specific file names or patterns to exclude
  excludeFiles: ['code_snapshot.txt', 'create_snapshot.js', 'package-lock.json'],

  // Max file size to include (in bytes) to avoid huge assets (e.g., 1MB)
  maxFileSize: 1 * 1024 * 1024,
};
// --- End Configuration ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname; // Assuming the script is in the project root

function shouldExclude(filePath, stats) {
  const baseName = path.basename(filePath);
  const relPath = path.relative(projectRoot, filePath);

  // Exclude specific files/patterns
  if (config.excludeFiles.includes(baseName) || config.excludeFiles.includes(relPath)) {
    return true;
  }

  // Exclude hidden files/folders (dotfiles/dotfolders) unless explicitly included
  if (baseName.startsWith('.') && !config.includeSpecificFiles.includes(relPath)) {
    // Allow specific dotfiles like .env if added to includeSpecificFiles later
    // For now, basic check is enough as .git etc are in excludeDirs
  }

  // Exclude based on file size
  if (stats.isFile() && stats.size > config.maxFileSize) {
    console.warn(`Excluding large file: ${relPath} (${(stats.size / 1024).toFixed(1)} KB)`);
    return true;
  }

  return false;
}

function walkDir(dir, outputFileStream) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relPath = path.relative(projectRoot, fullPath);

      if (item.isDirectory()) {
        // Check if directory name should be excluded
        if (!config.excludeDirs.includes(item.name)) {
          walkDir(fullPath, outputFileStream); // Recurse
        } else {
          // console.log(`Excluding directory: ${relPath}`); // Optional: Log excluded dirs
        }
      } else if (item.isFile()) {
        const fileExt = path.extname(item.name).toLowerCase();
        const stats = fs.statSync(fullPath);

        // Check if file should be included based on extension or specific list
        const isIncludedExtension = config.includeExtensions.includes(fileExt);
        const isIncludedSpecific = config.includeSpecificFiles.includes(relPath);

        if ((isIncludedExtension || isIncludedSpecific) && !shouldExclude(fullPath, stats)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            outputFileStream.write(`\n\n// ======= File: ${relPath} =======\n\n`);
            outputFileStream.write(content);
            // console.log(`Included file: ${relPath}`); // Optional: Log included files
          } catch (readErr) {
            console.error(`Error reading file ${relPath}: ${readErr.message}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
  }
}

function createCodeSnapshot() {
  const outputFilePath = path.join(projectRoot, config.outputFile);
  console.log(`Creating code snapshot at: ${outputFilePath}`);

  try {
    // Create a writable stream
    const outputFileStream = fs.createWriteStream(outputFilePath, { encoding: 'utf-8' });

    outputFileStream.write(`// Code Snapshot Generated: ${new Date().toISOString()}\n`);
    outputFileStream.write(`// Project Root: ${projectRoot}\n`);
    outputFileStream.write(`// Included Directories: ${config.directoriesToScan.join(', ')}\n`);
    outputFileStream.write(`// Included Extensions: ${config.includeExtensions.join(', ')}\n`);
    outputFileStream.write(`// Included Specific Files: ${config.includeSpecificFiles.join(', ')}\n`);
    outputFileStream.write(`// Excluded Directories: ${config.excludeDirs.join(', ')}\n`);
    outputFileStream.write(`// Excluded Files: ${config.excludeFiles.join(', ')}\n`);

    // Process each specified directory
    for (const dir of config.directoriesToScan) {
      const fullDir = path.join(projectRoot, dir);
      if (fs.existsSync(fullDir)) {
        walkDir(fullDir, outputFileStream);
      } else {
        console.warn(`Directory to scan not found: ${fullDir}`);
      }
    }

    // Close the stream
    outputFileStream.end();

    outputFileStream.on('finish', () => {
      console.log('Code snapshot created successfully.');
    });

    outputFileStream.on('error', (err) => {
      console.error('Error writing to snapshot file:', err);
    });

  } catch (err) {
    console.error(`Failed to create snapshot: ${err.message}`);
  }
}

// Run the function
createCodeSnapshot(); 
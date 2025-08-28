#!/usr/bin/env node

// Script to push permissions from instant.perms.ts to InstantDB
// Usage: node scripts/push-perms.js

const fs = require('fs');
const path = require('path');

async function pushPermissions() {
  try {
    // Import the permissions configuration
    const permsPath = path.join(process.cwd(), 'instant.perms.ts');
    
    if (!fs.existsSync(permsPath)) {
      console.error('❌ instant.perms.ts file not found');
      process.exit(1);
    }
    
    console.log('📋 Found instant.perms.ts file');
    console.log('🚀 Use the InstantDB MCP tools to push these permissions');
    console.log('');
    console.log('Permissions defined in instant.perms.ts:');
    
    // Read and display the permissions file
    const permsContent = fs.readFileSync(permsPath, 'utf8');
    console.log(permsContent);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

pushPermissions();
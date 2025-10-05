#!/usr/bin/env node

/**
 * YouTube Music Account Debugger CLI
 * Command-line tool to test YouTube Music accounts
 */

const YouTubeMusicAccountDebugger = require('./src/services/youtubeMusicAccountDebugger.js');

async function main() {
    console.log('🎵 YouTube Music Account Debugger CLI');
    console.log('=====================================');
    console.log('');

    const accountDebugger = new YouTubeMusicAccountDebugger();

    try {
        await accountDebugger.runFullTest();
    } catch (error) {
        console.error('💥 CLI test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
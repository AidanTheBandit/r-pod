/**
 * YouTube Music Account Debugger
 * A JavaScript utility to help identify the correct Google account for YouTube Music
 */

class YouTubeMusicAccountDebugger {
    constructor(apiBaseUrl = 'http://localhost:3001', serverPassword = 'music-aggregator-2025') {
        this.apiBaseUrl = apiBaseUrl;
        this.serverPassword = serverPassword;
        this.sessionId = this.generateSessionId();
    }

    generateSessionId() {
        return `debug_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.apiBaseUrl}${endpoint}`);
        url.searchParams.set('sessionId', this.sessionId);

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        const response = await fetch(url, {
            headers: {
                'X-Server-Password': this.serverPassword,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    async testAccounts() {
        console.log('🔍 Testing YouTube Music accounts...');
        try {
            const result = await this.makeRequest('/api/debug/accounts');
            return result;
        } catch (error) {
            console.error('❌ Account testing failed:', error);
            throw error;
        }
    }

    async testSingleAccount(accountIndex) {
        console.log(`🔍 Testing account ${accountIndex}...`);
        try {
            const result = await this.makeRequest('/api/debug/auth');
            return result;
        } catch (error) {
            console.error(`❌ Account ${accountIndex} test failed:`, error);
            throw error;
        }
    }

    formatAccountResults(results) {
        const output = [];

        for (const account of results.accounts_tested) {
            if (account.authentication_success) {
                const firstTrack = account.sample_tracks[0] || { title: 'No tracks', artist: 'Unknown' };
                output.push({
                    account: account.account_index,
                    status: '✅ Working',
                    music: `${firstTrack.title} by ${firstTrack.artist}`,
                    sections: account.home_sections.slice(0, 2).join(', '),
                    trackCount: account.total_tracks_found
                });
            } else {
                output.push({
                    account: account.account_index,
                    status: '❌ Failed',
                    error: account.error || 'Authentication failed'
                });
            }
        }

        return output;
    }

    displayResults(results) {
        console.log('\n📊 YouTube Music Account Test Results:');
        console.log('=' .repeat(60));

        const formatted = this.formatAccountResults(results);

        for (const account of formatted) {
            console.log(`Account ${account.account}: ${account.status}`);
            if (account.music) {
                console.log(`  🎵 Music: ${account.music}`);
                console.log(`  📂 Sections: ${account.sections}`);
                console.log(`  🎶 Tracks found: ${account.trackCount}`);
            } else if (account.error) {
                console.log(`  ❌ Error: ${account.error}`);
            }
            console.log('');
        }

        console.log('💡 Instructions:');
        console.log('   Look for the account that shows YOUR preferred music');
        console.log('   Set YOUTUBE_MUSIC_PROFILE to that account number in your .env file');
        console.log('   Example: YOUTUBE_MUSIC_PROFILE=0');
    }

    async runFullTest() {
        try {
            console.log('🚀 Starting YouTube Music Account Debugger');
            console.log(`📡 API: ${this.apiBaseUrl}`);
            console.log(`🔑 Session: ${this.sessionId}`);
            console.log('');

            const results = await this.testAccounts();
            this.displayResults(results);

            return results;
        } catch (error) {
            console.error('💥 Test failed:', error.message);
            console.log('');
            console.log('🔧 Troubleshooting:');
            console.log('   1. Make sure the backend is running');
            console.log('   2. Check your YOUTUBE_MUSIC_COOKIE in .env');
            console.log('   3. Verify the server password');
            throw error;
        }
    }
}

// Web interface functions
function createAccountDebuggerUI() {
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2>🎵 YouTube Music Account Debugger</h2>
            <p>This tool helps you identify which Google account has your preferred YouTube Music content.</p>

            <div style="margin: 20px 0;">
                <button id="testAccountsBtn" style="background: #4285f4; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">
                    🔍 Test Accounts
                </button>
                <button id="clearResultsBtn" style="background: #db4437; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; margin-left: 10px;">
                    🗑️ Clear
                </button>
            </div>

            <div id="results" style="margin-top: 20px;"></div>

            <div id="instructions" style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 4px; display: none;">
                <h3>📋 Instructions</h3>
                <ol>
                    <li>Click "Test Accounts" to scan all account indices (0-4)</li>
                    <li>Look for the account that shows YOUR preferred music</li>
                    <li>Note the account number (e.g., 0, 1, 2, etc.)</li>
                    <li>Update your <code>.env</code> file: <code>YOUTUBE_MUSIC_PROFILE=X</code></li>
                    <li>Restart the backend</li>
                </ol>
            </div>
        </div>
    `;

    // Add event listeners
    const testBtn = container.querySelector('#testAccountsBtn');
    const clearBtn = container.querySelector('#clearResultsBtn');
    const resultsDiv = container.querySelector('#results');
    const instructionsDiv = container.querySelector('#instructions');

    const accountDebugger = new YouTubeMusicAccountDebugger();

    testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = '🔄 Testing...';

        resultsDiv.innerHTML = '<p>🔍 Testing accounts 0-4...</p>';

        try {
            const results = await accountDebugger.testAccounts();
            const formatted = accountDebugger.formatAccountResults(results);

            let html = '<h3>📊 Results:</h3>';
            for (const account of formatted) {
                html += `
                    <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px;">
                        <h4>Account ${account.account}: ${account.status}</h4>
                        ${account.music ? `
                            <p><strong>🎵 Music:</strong> ${account.music}</p>
                            <p><strong>📂 Sections:</strong> ${account.sections}</p>
                            <p><strong>🎶 Tracks:</strong> ${account.trackCount}</p>
                        ` : account.error ? `
                            <p style="color: red;"><strong>❌ Error:</strong> ${account.error}</p>
                        ` : ''}
                    </div>
                `;
            }

            resultsDiv.innerHTML = html;
            instructionsDiv.style.display = 'block';

        } catch (error) {
            resultsDiv.innerHTML = `<p style="color: red;">❌ Error: ${error.message}</p>`;
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '🔍 Test Accounts';
        }
    });

    clearBtn.addEventListener('click', () => {
        resultsDiv.innerHTML = '';
        instructionsDiv.style.display = 'none';
    });

    return container;
}

// Export for Node.js or make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeMusicAccountDebugger;
} else if (typeof window !== 'undefined') {
    window.YouTubeMusicAccountDebugger = YouTubeMusicAccountDebugger;
    window.createAccountDebuggerUI = createAccountDebuggerUI;
}

// CLI usage example
if (typeof require !== 'undefined' && require.main === module) {
    const accountDebugger = new YouTubeMusicAccountDebugger();
    accountDebugger.runFullTest().catch(console.error);
}
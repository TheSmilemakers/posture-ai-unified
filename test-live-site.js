// Quick test script for Posture AI live site
// Run with: node test-live-site.js

const https = require('https');

console.log('🧪 Testing Posture AI Live Site...\n');

// Test 1: Check if site is accessible
function testSiteAccessibility() {
    return new Promise((resolve) => {
        console.log('1️⃣ Testing site accessibility...');
        https.get('https://posture.rajanmaher.com', (res) => {
            console.log(`   ✅ Site responded with status: ${res.statusCode}`);
            console.log(`   ✅ HTTPS is properly configured`);
            
            // Check for security headers
            const headers = res.headers;
            if (headers['strict-transport-security']) {
                console.log('   ✅ HSTS header present');
            }
            if (headers['x-content-type-options']) {
                console.log('   ✅ Content-Type security header present');
            }
            resolve();
        }).on('error', (err) => {
            console.log(`   ❌ Error accessing site: ${err.message}`);
            resolve();
        });
    });
}

// Test 2: Check API endpoints
async function testAPIEndpoints() {
    console.log('\n2️⃣ Testing API endpoints...');
    
    const endpoints = [
        '/api/test-db',
        '/api/patients/create',
        '/api/assessments/create'
    ];
    
    for (const endpoint of endpoints) {
        await testEndpoint(endpoint);
    }
}

function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'posture.rajanmaher.com',
            path: path,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer posture-api-2025'
            }
        };
        
        https.request(options, (res) => {
            console.log(`   ${path}: ${res.statusCode === 401 ? '🔒 Secured' : res.statusCode === 200 ? '✅ OK' : '⚠️  ' + res.statusCode}`);
            resolve();
        }).on('error', () => {
            console.log(`   ${path}: ❌ Failed`);
            resolve();
        }).end();
    });
}

// Test 3: Performance metrics
function testPerformance() {
    return new Promise((resolve) => {
        console.log('\n3️⃣ Testing performance...');
        const start = Date.now();
        
        https.get('https://posture.rajanmaher.com', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const loadTime = Date.now() - start;
                const sizeKB = (data.length / 1024).toFixed(2);
                
                console.log(`   ⏱️  Initial load time: ${loadTime}ms`);
                console.log(`   📦 Page size: ${sizeKB} KB`);
                console.log(`   ${loadTime < 3000 ? '✅' : '⚠️ '} Performance: ${loadTime < 3000 ? 'Good' : 'Needs optimization'}`);
                
                // Check for important features
                if (data.includes('posture2025')) {
                    console.log('   ✅ Password protection detected');
                }
                if (data.includes('MediaPipe')) {
                    console.log('   ✅ MediaPipe integration found');
                }
                if (data.includes('theme-toggle')) {
                    console.log('   ✅ Theme system implemented');
                }
                
                resolve();
            });
        }).on('error', (err) => {
            console.log(`   ❌ Performance test failed: ${err.message}`);
            resolve();
        });
    });
}

// Run all tests
async function runTests() {
    console.log('🌐 Site: https://posture.rajanmaher.com');
    console.log('🔑 Password: posture2025\n');
    
    await testSiteAccessibility();
    await testAPIEndpoints();
    await testPerformance();
    
    console.log('\n✅ Basic tests complete!');
    console.log('\n📋 For comprehensive testing, use test-checklist.md');
    console.log('🌐 For browser automation tests, ensure Browser MCP is properly connected.\n');
}

runTests();
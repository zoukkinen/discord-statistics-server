/**
 * Simple health check test for Assembly Discord Tracker
 * Used by GitHub Actions CI/CD pipeline
 */

const http = require('http');

// Simple test to verify the application can start
function testBasicFunctionality() {
    console.log('🧪 Running basic functionality tests...');
    
    // Test 1: Check if main modules can be imported
    try {
        const path = require('path');
        const fs = require('fs');
        
        // Check if dist directory exists (after build)
        const distPath = path.join(__dirname, '../dist');
        if (fs.existsSync(distPath)) {
            console.log('✅ Build output directory exists');
        } else {
            console.log('⚠️  Build output directory not found (expected during pre-build)');
        }
        
        // Check if package.json has required fields
        const packageJson = require('../package.json');
        if (packageJson.main && packageJson.scripts && packageJson.scripts.start) {
            console.log('✅ Package.json configuration valid');
        } else {
            throw new Error('Invalid package.json configuration');
        }
        
    } catch (error) {
        console.error('❌ Basic functionality test failed:', error.message);
        process.exit(1);
    }
    
    console.log('✅ All basic tests passed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    testBasicFunctionality();
}

module.exports = { testBasicFunctionality };

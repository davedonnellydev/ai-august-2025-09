// Simple test script to verify sync functionality
// Run with: node test-sync.js

const { syncByLabel } = require('./app/lib/email/syncByLabel.ts');

async function testSync() {
  try {
    console.log('Testing Gmail sync by label...');
    
    const result = await syncByLabel({
      userId: '2d30743e-10cb-4490-933c-4ccdf37364e9',
      label: 'Label_969329089524850868',
      maxFetch: 5,
    });
    
    console.log('Sync result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSync();

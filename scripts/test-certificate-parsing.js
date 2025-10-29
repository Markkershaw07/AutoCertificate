/**
 * Test script to verify certificate parsing logic
 */

const data = {
  response: {
    'section.efaw': '170',
    'section.pfa': '18',
    'section.epfa': '30',
    'section.bls+aed': '50',
    'section.faw': '0'
  }
};

// Simulate the findFieldValue function
const findFieldValue = (response, suffix) => {
  const fieldKey = Object.keys(response).find(key => key.endsWith(suffix));
  if (!fieldKey) return 0;
  const value = response[fieldKey];
  const parsed = parseInt(String(value || '0')) || 0;
  return Math.max(0, parsed);
};

// Test the new fallback pattern for BLS+AED
const blsAed = findFieldValue(data.response, '.bls+aed') ||
               findFieldValue(data.response, '.bls-+-aed') ||
               findFieldValue(data.response, '.bls-aed') ||
               findFieldValue(data.response, '.blsaed');

const efaw = findFieldValue(data.response, '.efaw');
const pfa = findFieldValue(data.response, '.pfa');
const epfa = findFieldValue(data.response, '.epfa');
const faw = findFieldValue(data.response, '.faw');

console.log('Certificate counts:');
console.log('EFAW:', efaw);
console.log('PFA:', pfa);
console.log('EPFA:', epfa);
console.log('BLS+AED:', blsAed);
console.log('FAW:', faw);
console.log('Total:', efaw + pfa + epfa + blsAed + faw);
console.log('Expected: 268');
console.log(efaw + pfa + epfa + blsAed + faw === 268 ? '✓ PASS' : '✗ FAIL');

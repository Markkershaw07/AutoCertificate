const fetch = require('node:fetch');

const API_KEY = process.env.SHEEPCRM_API_KEY || 'xx-854c0743cd';
const BUCKET = 'faib';
const BASE_URL = 'https://api.sheepcrm.com';

async function getTrainingProviders() {
  console.log('🔍 Fetching all members...\n');

  const url = `${BASE_URL}/api/v1/${BUCKET}/member/?limit=100`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  // Filter for Training Provider memberships only
  const trainingProviders = data.members.filter(m =>
    m.display_value && m.display_value.includes('First Aid Training Provider')
  );

  console.log(`Found ${trainingProviders.length} Training Provider memberships:\n`);

  trainingProviders.slice(0, 10).forEach((member, i) => {
    console.log(`${i + 1}. ${member.display_value}`);
    console.log(`   Licence: ${member.membership_number}`);
    console.log(`   Status: ${member.membership_record_status}`);
    console.log(`   Member URI: ${member.uri}`);
    console.log(`   Period: ${member.start_date.split('T')[0]} to ${member.end_date.split('T')[0]}`);
    console.log();
  });

  return trainingProviders;
}

getTrainingProviders().catch(console.error);

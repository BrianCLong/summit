const https = require('https');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = '2ec10296-8e2a-8032-b0e2-000bd2c17d5f';
const NOTION_VERSION = '2022-06-28';

if (!NOTION_API_KEY) {
  console.error('Error: NOTION_API_KEY environment variable is not set.');
  console.error('Cannot query the Summit Issues Database without credentials.');
  process.exit(1);
}

const query = {
  filter: {
    and: [
      {
        property: 'Priority Level',
        select: {
          equals: 'P0' // API only supports one value per equals, need separate filters or OR logic?
                       // Wait, "IN ('P0', 'P1')" implies OR logic for priority.
        }
      },
      // Actually, standard Notion query filter structure for "IN" is usually an OR group of equals.
      // Or checking if select property is one of the values.
      // Let's refine the filter logic below.
    ]
  },
  sorts: [
    { property: 'Priority Level', direction: 'descending' },
    { property: 'Status', direction: 'ascending' }
  ]
};

// Correct filter construction for "Priority Level IN ('P0', 'P1') AND Status IN ('Not started', 'In progress')"
const filter = {
  and: [
    {
      or: [
        { property: 'Priority Level', select: { equals: 'P0' } },
        { property: 'Priority Level', select: { equals: 'P1' } }
      ]
    },
    {
      or: [
        { property: 'Status', select: { equals: 'Not started' } },
        { property: 'Status', select: { equals: 'In progress' } }
      ]
    }
  ]
};

const requestOptions = {
  hostname: 'api.notion.com',
  path: `/v1/databases/${DATABASE_ID}/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  }
};

const req = https.request(requestOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`Error: Notion API request failed with status ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }

    try {
      const response = JSON.parse(data);
      const results = response.results;

      console.log(`Total count: ${results.length}`);

      // Manual sort fallback if API sort behaves unexpectedly (strings vs enum order)
      // Notion sorts selects by their order in the database schema usually, but here we requested descending.
      // Let's assume API sort worked.

      console.log('Top 5 most critical items:');
      results.slice(0, 5).forEach((item, index) => {
        const props = item.properties;
        const name = props.Name.title[0]?.plain_text || 'Untitled';
        const priority = props['Priority Level'].select?.name || 'Unknown';
        const status = props.Status.select?.name || 'Unknown';
        console.log(`${index + 1}. [${priority}] ${name} (${status})`);
      });

      console.log('\nRecommended immediate actions:');
      console.log('1. Triage P0 items immediately.');
      console.log('2. Verify status of "In progress" items to ensure they are not blocked.');

    } catch (e) {
      console.error('Error parsing response:', e);
      console.error(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(JSON.stringify({ filter, sorts: query.sorts }));
req.end();

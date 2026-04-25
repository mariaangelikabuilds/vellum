import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  const { db } = await import('../src/db/index');
  const { orgs, users, documents } = await import('../src/db/schema');
  const { listClaimsForDocument, findSupportingEvidence } = await import('../src/db/graph');

  const orgRows = await db.select().from(orgs);
  const userRows = await db.select().from(users);
  const docRows = await db.select().from(documents);

  console.log('Relational:');
  console.log('  orgs       ', orgRows.length);
  console.log('  users      ', userRows.length);
  console.log('  documents  ', docRows.length);

  if (docRows[0]) {
    const docId = docRows[0].id;
    const claims = await listClaimsForDocument(docId);
    console.log('\nGraph (vellum_claims):');
    console.log('  claims for doc', docId.slice(0, 8) + '…');
    for (const row of claims) {
      console.log('   ', row);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FAIL:', e instanceof Error ? e.message : e);
    process.exit(1);
  });

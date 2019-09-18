// https://github.com/node-casbin/typeorm-adapter/blob/304afea/test/adapter.test.ts

import * as assert from 'assert';
import * as admin from 'firebase-admin';
import FirestoreAdapter from '../src/adapter';
import { Enforcer, newEnforcer, Util } from 'casbin';

function testGetPolicy(e: Enforcer, res: string[][]) {
  const myRes = e.getPolicy();
  assert.deepStrictEqual(myRes.sort(), res.sort());
}

admin.initializeApp();

it('TestAdapter', async () => {
  const a = await FirestoreAdapter.newAdapter(admin.firestore(), 'test');
  // Because the DB is empty at first,
  // so we need to load the policy from the file adapter (.CSV) first.
  let e = await newEnforcer(
    'examples/rbac_model.conf',
    'examples/rbac_policy.csv'
  );

  // This is a trick to save the current policy to the DB.
  // We can't call e.savePolicy() because the adapter in the enforcer is still the file adapter.
  // The current policy means the policy in the Node-Casbin enforcer (aka in memory).
  await a.savePolicy(e.getModel());

  // Clear the current policy.
  e.clearPolicy();
  testGetPolicy(e, []);

  // Load the policy from DB.
  await a.loadPolicy(e.getModel());
  testGetPolicy(e, [
    ['alice', 'data1', 'read'],
    ['bob', 'data2', 'write'],
    ['data2_admin', 'data2', 'read'],
    ['data2_admin', 'data2', 'write'],
  ]);

  // Note: you don't need to look at the above code
  // if you already have a working DB with policy inside.

  // Now the DB has policy, so we can provide a normal use case.
  // Create an adapter and an enforcer.
  // newEnforcer() will load the policy automatically.
  e = await newEnforcer('examples/rbac_model.conf', a);
  testGetPolicy(e, [
    ['alice', 'data1', 'read'],
    ['bob', 'data2', 'write'],
    ['data2_admin', 'data2', 'read'],
    ['data2_admin', 'data2', 'write'],
  ]);

  // Add policy to DB
  await a.addPolicy('', 'p', ['role', 'res', 'action']);
  e = await newEnforcer('examples/rbac_model.conf', a);
  testGetPolicy(e, [
    ['alice', 'data1', 'read'],
    ['bob', 'data2', 'write'],
    ['data2_admin', 'data2', 'read'],
    ['data2_admin', 'data2', 'write'],
    ['role', 'res', 'action'],
  ]);

  // Remove policy from DB
  await a.removePolicy('', 'p', ['role', 'res', 'action']);
  e = await newEnforcer('examples/rbac_model.conf', a);
  testGetPolicy(e, [
    ['alice', 'data1', 'read'],
    ['bob', 'data2', 'write'],
    ['data2_admin', 'data2', 'read'],
    ['data2_admin', 'data2', 'write'],
  ]);
}).timeout(60 * 1000);

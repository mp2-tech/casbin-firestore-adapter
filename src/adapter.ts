import { CasbinRule } from './model';
import { Adapter, Helper, Model, Assertion } from 'casbin';
import {
  WhereFilterOp,
  Firestore,
  CollectionReference,
  Query,
  QueryDocumentSnapshot,
} from '@google-cloud/firestore';

type WhereFilter = [string, WhereFilterOp, any];

export default class FirestoreAdapter implements Adapter {
  private isFiltered = false;

  private constructor(
    private readonly store: Firestore,
    private readonly collectionName: string = 'casbin'
  ) {}

  static async newAdapter(store: Firestore, collectionName?: string) {
    return new FirestoreAdapter(store, collectionName);
  }

  static async newFilteredAdapter(store: Firestore, collectionName?: string) {
    const adapter = await FirestoreAdapter.newAdapter(store, collectionName);
    adapter.setFiltered(true);
    return adapter;
  }

  private get collection() {
    return this.store.collection(this.collectionName);
  }

  setFiltered(isFiltered = true) {
    this.isFiltered = true;
  }

  loadPolicyLine(line: QueryDocumentSnapshot, model: Model) {
    const data = line.data() as CasbinRule;
    const result =
      data.ptype +
      ', ' +
      [data.v0, data.v1, data.v2, data.v3, data.v4, data.v5]
        .filter(n => n)
        .join(', ');
    Helper.loadPolicyLine(result, model);
  }

  loadPolicy(model: Model) {
    return this.loadFilteredPolicy(model, []);
  }

  async loadFilteredPolicy(model: Model, filter: WhereFilter[]) {
    let query: CollectionReference | Query = this.collection;
    for (const whereFilter of filter) {
      query = query.where(...whereFilter);
    }
    const querySnap = await query.get();
    querySnap.forEach(line => {
      this.loadPolicyLine(line, model);
    });
  }

  savePolicyLine(ptype: string, rule: string[]) {
    const model = new CasbinRule(this.collection.doc().id, {
      ptype,
    });

    if (rule.length > 0) {
      model.v0 = rule[0];
    }

    if (rule.length > 1) {
      model.v1 = rule[1];
    }

    if (rule.length > 2) {
      model.v2 = rule[2];
    }

    if (rule.length > 3) {
      model.v3 = rule[3];
    }

    if (rule.length > 4) {
      model.v4 = rule[4];
    }

    if (rule.length > 5) {
      model.v5 = rule[5];
    }

    return model;
  }

  private async persistLines(lines: CasbinRule[]) {
    await this.store.runTransaction(async tx => {
      for (const line of lines) {
        const docRef = this.collection.doc(line.id);
        const data = line.data();
        tx.set(docRef, data);
      }
    });
  }

  private async presistLine(line: CasbinRule) {
    const docRef = this.collection.doc(line.id);
    const data = line.data();
    await docRef.set(data);
  }

  async savePolicy(model: Model) {
    const policyRuleAST: Map<string, Assertion> =
      model.model.get('p') || new Map();
    const groupingPolicyAST: Map<string, Assertion> =
      model.model.get('g') || new Map();
    const lines: CasbinRule[] = [];

    for (const [ptype, ast] of policyRuleAST) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        lines.push(line);
      }
    }

    for (const [ptype, ast] of groupingPolicyAST) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        lines.push(line);
      }
    }

    await this.persistLines(lines);

    return true;
  }

  async addPolicy(sec: string, ptype: string, rule: string[]) {
    const line = this.savePolicyLine(ptype, rule);
    await this.presistLine(line);
  }

  async removePolicy(sec: string, ptype: string, rule: string[]) {
    const line = this.savePolicyLine(ptype, rule);
    const data = line.data();
    let query: CollectionReference | Query = this.collection;
    for (const [propName, propVal] of Object.entries(data)) {
      query = query.where(propName, '==', propVal);
    }
    const querySnap = await query.get();
    const batch = this.store.batch();
    querySnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ) {
    let query = this.collection.where('ptype', '==', ptype);
    if (fieldIndex <= 0 && 0 < fieldIndex + fieldValues.length) {
      query = query.where('v0', '==', fieldValues[0 - fieldIndex]);
    }
    if (fieldIndex <= 1 && 1 < fieldIndex + fieldValues.length) {
      query = query.where('v1', '==', fieldValues[1 - fieldIndex]);
    }
    if (fieldIndex <= 2 && 2 < fieldIndex + fieldValues.length) {
      query = query.where('v2', '==', fieldValues[2 - fieldIndex]);
    }
    if (fieldIndex <= 3 && 3 < fieldIndex + fieldValues.length) {
      query = query.where('v3', '==', fieldValues[3 - fieldIndex]);
    }
    if (fieldIndex <= 4 && 4 < fieldIndex + fieldValues.length) {
      query = query.where('v4', '==', fieldValues[4 - fieldIndex]);
    }
    if (fieldIndex <= 5 && 5 < fieldIndex + fieldValues.length) {
      query = query.where('v5', '==', fieldValues[5 - fieldIndex]);
    }
    const querySnap = await query.get();
    const batch = this.store.batch();
    querySnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}

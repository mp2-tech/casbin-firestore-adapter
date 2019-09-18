import { DocumentSnapshot } from '@google-cloud/firestore';

export interface CasbinRuleData {
  ptype: string | null;
  v0: string | null;
  v1: string | null;
  v2: string | null;
  v3: string | null;
  v4: string | null;
  v5: string | null;
}

export class CasbinRule {
  readonly id: string;
  ptype: string | null;
  v0: string | null;
  v1: string | null;
  v2: string | null;
  v3: string | null;
  v4: string | null;
  v5: string | null;

  constructor(id: string, data: Partial<CasbinRuleData>) {
    this.id = id;
    this.ptype = data.ptype || null;
    this.v0 = data.v0 || null;
    this.v1 = data.v1 || null;
    this.v2 = data.v2 || null;
    this.v3 = data.v3 || null;
    this.v4 = data.v4 || null;
    this.v5 = data.v5 || null;
  }

  static fromDocSnap(docSnap: DocumentSnapshot): CasbinRule {
    return new CasbinRule(docSnap.id, docSnap.data() || {});
  }

  data(): CasbinRuleData {
    return {
      ptype: this.ptype,
      v0: this.v0,
      v1: this.v1,
      v2: this.v2,
      v3: this.v3,
      v4: this.v4,
      v5: this.v5,
    };
  }
}

import {DocumentManager} from './db/dataManager';
import {MongoDocument} from './db/mongoDocument';

test('shoes', () => {
  expect(DBAccount.db.query.parse(a => a.email === 'hi')).toEqual({
    email: "'hi'",
  });
});

export class DBAccount extends MongoDocument {
  static collectionName = 'account';
  static db = new DocumentManager<DBAccount>(DBAccount.collectionName);

  email: string;
  passwordHash?: string;
  phoneNumber?: string;
  accountSetUp: boolean;

  forgotPasswordCode: string;
  forgotPasswordExpiration: Date;

  accountOwner?: string;

  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;

  contactType: AccountContactTypes;

  allowPromotionalCommunication: boolean;
  hubspotId?: number;

  createdDate: Date;
  updatedDate: Date;
  notes: DBNote[];
}
export interface DBNote {
  note: string;
  user: string;
  createdDate: Date;
}
export enum AccountContactTypes {
  nonProfit = 'nonProfit',
  association = 'association',
  healthcareProvider = 'healthcareProvider',
  broker = 'broker',
  employer = 'employer',
  other = 'other',
}

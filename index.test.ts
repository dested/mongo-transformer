import {DocumentManager} from './db/dataManager';
import {MongoDocument} from './db/mongoDocument';
/*
test('shoes', () => {
  expect(DBAccount.db.query.parse(a => a.email === 'hello')).toEqual({
    email: 'hello',
  });
});
test('shoes3', () => {
  expect(DBAccount.db.query.parse(a => a.hubspotId === 12)).toEqual({
    hubspotId: 12,
  });
});
test('shoes4', () => {
  expect(DBAccount.db.query.parse(a => a.accountSetUp === true)).toEqual({
    accountSetUp: true,
  });
});

test('shoes5', () => {
  const b = 123;
  expect(DBAccount.db.query.parse(a => a.hubspotId === b)).toEqual({
    hubspotId: b,
  });
});

test('shoes6', () => {
  const b = AccountContactTypes.association;
  expect(DBAccount.db.query.parse(a => a.contactType === b)).toEqual({
    contactType: b,
  });
});

test('shoes7', () => {
  expect(DBAccount.db.query.parse(a => a.note.note === 'shoes')).toEqual({
    'note.note': 'shoes',
  });
});*/
test('shoes8', () => {
  expect(DBAccount.db.query.parse(a => a.notes.some(b => b.note === 'a'))).toEqual({
    ['notes']: {$elemMatch: {note: 'a'}},
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
  note: DBNote;
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

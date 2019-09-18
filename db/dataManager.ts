import {Cursor, Db, FilterQuery, IndexOptions, MongoClient, ObjectID} from 'mongodb';
import {QueryBuilder} from './queryBuilder';

let dbcon: Db;

export class DataManager {
  static get dbConnection(): Db {
    return dbcon;
  }
}

export class DocumentUtils {
  static readonly empty: any = null;
  static readonly false = false;
  static readonly true = true;
  static readonly zero = 0;
}

export class DocumentManager<T extends {_id: ObjectID}> {
  query = new QueryBuilder<T>();

  constructor(private collectionName: string) {}

  async insertDocument(document: T): Promise<T> {
    const result = await this.getCollection().insertOne(document);
    document._id = result.insertedId;
    return document;
  }

  getCollection() {
    return DataManager.dbConnection.collection<T>(this.collectionName);
  }

  async insertDocuments(documents: T[]): Promise<T[]> {
    const result = await this.getCollection().insertMany(documents);
    for (let i = 0; i < documents.length; i++) {
      documents[i]._id = result.insertedIds[i];
    }
    return documents;
  }

  async updateDocument(document: T): Promise<T> {
    const collection = this.getCollection();

    await collection.findOneAndReplace({_id: document._id} as any, document);
    return document;
  }

  async getOneQuery(query: (q: T) => boolean): Promise<T>;
  async getOneQuery<P>(query: (q: T, params: P) => boolean, params: P): Promise<T>;
  async getOneQuery<P>(query: (q: T, params: P) => boolean, params?: P): Promise<T> {
    return await this.getCollection().findOne(this.query.parse(query, params));
  }

  async getOne(query: FilterQuery<T>, projection?: any): Promise<T | null> {
    if (projection) {
      return this.getCollection().findOne(query, {projection});
    } else {
      return this.getCollection().findOne(query);
    }
  }

  async getAllProject<TOverride = T>(query: FilterQuery<T>, projection: any): Promise<TOverride[]> {
    // console.time(`getting all ${this.collectionName} ${JSON.stringify(query)}`);
    const items = (await DataManager.dbConnection
      .collection(this.collectionName)
      .find(query)
      .project(projection)).toArray();
    // console.timeEnd(`getting all ${this.collectionName} ${JSON.stringify(query)}`);
    return items;
  }

  async aggregate<TAgg>(query: any): Promise<TAgg[]> {
    return DataManager.dbConnection
      .collection(this.collectionName)
      .aggregate(query)
      .toArray();
  }

  async getById(id: string | ObjectID, projection?: any): Promise<T | null> {
    const objectId: ObjectID = typeof id === 'string' ? ObjectID.createFromHexString(id) : id;
    if (projection) {
      return DataManager.dbConnection.collection(this.collectionName).findOne({_id: objectId}, {projection});
    } else {
      return DataManager.dbConnection.collection(this.collectionName).findOne({_id: objectId});
    }
  }

  async deleteMany(query: FilterQuery<T>): Promise<void> {
    await this.getCollection().deleteMany(query);
  }
  async deleteOne(query: FilterQuery<T>): Promise<void> {
    await this.getCollection().deleteOne(query);
  }

  async getAllQuery(query: (q: T) => boolean): Promise<T[]>;
  async getAllQuery<P>(query: (q: T, params: P) => boolean, params: P): Promise<T[]>;
  async getAllQuery<P>(query: (q: T, params: P) => boolean, params?: P): Promise<T[]> {
    return (await this.getCollection().find(this.query.parse(query, params))).toArray();
  }

  async getAll(query: FilterQuery<T>): Promise<T[]> {
    return (await this.getCollection().find(query)).toArray();
  }

  async exists(query: FilterQuery<T>): Promise<boolean> {
    return (await this.getCollection().count(query, {})) > 0;
  }

  async getAllPaged(
    query: FilterQuery<T>,
    sortKey: keyof T | null,
    sortDirection: number,
    page: number,
    take: number
  ): Promise<T[]> {
    let cursor = DataManager.dbConnection.collection(this.collectionName).find(query);
    if (sortKey) {
      cursor = cursor.sort(sortKey as string, sortDirection);
    }
    return (await cursor.skip(page * take).limit(take)).toArray();
  }

  getAllCursor(query: FilterQuery<T>, sortKey: keyof T | null, sortDirection: number, page: number, take: number): Cursor<T> {
    let cursor = DataManager.dbConnection.collection(this.collectionName).find(query);
    if (sortKey) {
      cursor = cursor.sort(sortKey as string, sortDirection);
    }
    return cursor.skip(page * take).limit(take);
  }

  async countQuery(query: (q: T) => boolean): Promise<number>;
  async countQuery<P>(query: (q: T, params: P) => boolean, params: P): Promise<number>;
  async countQuery<P>(query: (q: T, params: P) => boolean, params?: P): Promise<number> {
    return await this.getCollection().count(this.query.parse(query, params));
  }

  async count(query: FilterQuery<T>): Promise<number> {
    return await this.getCollection().count(query, {});
  }

  async ensureIndex(spec: any, options: IndexOptions): Promise<string> {
    return await this.getCollection().createIndex(spec, options);
  }
}

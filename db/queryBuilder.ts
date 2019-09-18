export class QueryBuilder<T> {
  parse(query: (q: T) => boolean): object;
  parse<P>(query: (q: T, params: P) => boolean, params: P): object;
  parse<P>(query: (q: T, params: P) => boolean, params?: P): object {
    return query as any;
  }
}

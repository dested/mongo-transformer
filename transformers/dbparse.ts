import * as ts from 'typescript';
import {
  ArrowFunction,
  Expression,
  Identifier,
  LeftHandSideExpression,
  LiteralExpression,
  MemberExpression,
  PrefixUnaryExpression,
  PropertyAccessExpression,
  SyntaxKind,
} from 'typescript';

function parseArrow(arrow: ArrowFunction, sourceFile: ts.SourceFile) {
  const result = new ParseFile(sourceFile).start(arrow);

  const literal = objectToAssignments(result);

  return literal;
}

function objectToAssignments(result: any) {
  const assignments: ts.PropertyAssignment[] = [];
  for (const resultKey in result) {
    if (!result.hasOwnProperty(resultKey)) {
      continue;
    }
    const rightResult = result[resultKey];
    let right: any;
    switch (rightResult.variable) {
      case 'local':
      case 'params':
        right = ts.createIdentifier(rightResult.expression);
        break;
      default:
        if (rightResult.expression) {
          right = ts.createLiteral(rightResult.expression);
        } else {
          right = objectToAssignments(rightResult);
        }
        break;
    }

    if (resultKey.indexOf('.') >= 0) {
      assignments.push(ts.createPropertyAssignment(ts.createStringLiteral(resultKey), right));
    } else {
      assignments.push(ts.createPropertyAssignment(resultKey, right));
    }
  }
  return ts.createObjectLiteral(assignments);
}

export class ParseFile {
  constructor(private sourceFile: ts.SourceFile) {}
  parseBody(body: Expression, variableNames: string[]) {
    if (ts.isBinaryExpression(body)) {
      if (
        body.operatorToken.kind === SyntaxKind.AmpersandAmpersandToken ||
        body.operatorToken.kind === SyntaxKind.BarBarToken
      ) {
        return this.parseLogicalExpression(body, variableNames);
      } else {
        return this.parseBinaryExpression(body, variableNames);
      }
    } else if (ts.isPrefixUnaryExpression(body)) {
      return this.parseUnaryExpression(body, variableNames);
    } else if (ts.isCallLikeExpression(body)) {
      return this.parseSide(body, variableNames);
      /*
      return this.parseUnaryExpression(
        {
          type: 'UnaryExpression',
          operator: 'void',
          prefix: true,
          argument: body,
        },
        variableNames
      );
*/
    } else {
      throw new Error('Expression must be Binary or Logical: ' + body.getText(this.sourceFile));
    }
  }

  private parseLogicalExpression(body: ts.BinaryExpression, variableNames: string[]): any {
    const left = this.parseBody(body.left, variableNames);
    const right = this.parseBody(body.right, variableNames);
    switch (body.operatorToken.kind) {
      case SyntaxKind.AmpersandAmpersandToken:
        return {
          $and: [left, right],
        };
      case SyntaxKind.BarBarToken:
        return {
          $or: [left, right],
        };
    }
  }

  parseBinaryExpression(body: ts.BinaryExpression, variableNames: string[]): any {
    const leftSide = this.parseSide(body.left, variableNames);
    const rightSide = this.parseSide(body.right, variableNames);

    const left = leftSide.expression;
    const right = rightSide;
    let result: any;

    switch (body.operatorToken.kind) {
      case SyntaxKind.EqualsEqualsToken:
      case SyntaxKind.EqualsEqualsEqualsToken:
        result = {[left]: right};
        break;
      case SyntaxKind.ExclamationEqualsToken:
      case SyntaxKind.ExclamationEqualsEqualsToken:
        result = {[left]: {$ne: right}};
        break;
      case SyntaxKind.GreaterThanToken:
        result = {[left]: {$gt: right}};
        break;
      case SyntaxKind.GreaterThanEqualsToken:
        result = {[left]: {$gte: right}};
        break;
      case SyntaxKind.LessThanToken:
        result = {[left]: {$lt: right}};
        break;
      case SyntaxKind.LessThanEqualsToken:
        result = {[left]: {$lte: right}};
        break;
      default:
        throw new Error(`Binary Expression can only be ==, ===, >, <, >=, <=, &&, || : ${body.operatorToken.kind}`);
    }

    if (leftSide.shouldBeUnary === true) {
      throw new Error('Left side should have been unary');
    }

    if (leftSide.variable === 'local' && leftSide.expressionName.endsWith('.length')) {
      const rightExpression = result[left];

      return {
        [leftSide.expressionName.replace('.length', '')]: {
          $size: rightExpression,
        },
      };
    }

    return result;
  }

  parseUnaryExpression(body: ts.PrefixUnaryExpression, variableNames: string[]): any {
    const side = this.parseSide(body.operand, variableNames);

    if (side.shouldBeUnary === false) {
      throw Error('Expression was supposed to be Unary');
    }
    return side;
  }

  parseSide(
    side: ts.Expression,
    variableNames: string[]
  ): {
    expression: any;
    variable?: 'params' | 'local' | 'string' | 'number' | 'boolean';
    expressionName?: string;
    shouldBeUnary: boolean;
  } {
    if (ts.isIdentifier(side) || ts.isPropertyAccessExpression(side)) {
      const name = this.flattenObject(side, variableNames);
      const nameWithoutInitial = name
        .split('.')
        .slice(1)
        .join('.');
      if (variableNames.find(a => a === name.split('.')[0])) {
        return {
          expression: nameWithoutInitial,
          expressionName: nameWithoutInitial,
          shouldBeUnary: false,
          variable: 'local',
        };
      }
      return {
        expression: name,
        expressionName: name,
        shouldBeUnary: false,
        variable: 'params',
      };
    } else if (ts.isLiteralExpression(side)) {
      if (ts.isStringLiteral(side)) {
        return {
          expression: side.text,
          shouldBeUnary: false,
          variable: null,
        };
      }
      if (ts.isNumericLiteral(side)) {
        return {
          expression: parseFloat(side.text),
          shouldBeUnary: false,
          variable: null,
        };
      }
      if (side.text === 'false') {
        return {
          expression: false,
          shouldBeUnary: false,
          variable: null,
        };
      }
      if (side.text === 'true') {
        return {
          expression: true,
          shouldBeUnary: false,
          variable: null,
        };
      }
      throw new Error('BAD TEXT ' + side.text);
    } else if (ts.isCallLikeExpression(side)) {
      const callExpression = side as ts.CallExpression;
      const callee = this.parseSide(callExpression.expression, variableNames);
      const calleeName = callee.expressionName;
      const calleeNamePieces = calleeName.split('.');
      const functionName = calleeNamePieces[calleeNamePieces.length - 1];

      const propertyName = calleeNamePieces.slice(0, calleeNamePieces.length - 1).join('.');

      switch (functionName) {
        case 'some': {
          if (callExpression.arguments.length !== 1) {
            throw new Error('There must only be one Some Argument');
          }
          const arrow = callExpression.arguments[0];

          if (!ts.isArrowFunction(arrow)) {
            throw new Error('Function must be an arrow function.');
          }

          const innerVariableName = (arrow.parameters[0].name as Identifier).text;

          const queryResult = this.parseBody(arrow.body as Expression, [...variableNames, innerVariableName]);

          switch (callee.variable) {
            case 'local':
              console.log(queryResult);
              return {
                expression: {[propertyName]: {$elemMatch: queryResult}},
                shouldBeUnary: true,
                variable: null,
              };
            case 'params':
              if (!queryResult['']) {
                throw new Error('Params some must have the argument on the left side of the expression');
              }
              if (typeof queryResult[''] !== 'string') {
                throw new Error('Params some must have only a field on the right side of the expression');
              }
              const inField = queryResult[''];
              return {
                expression: {[inField]: {$in: propertyName}},
                shouldBeUnary: true,
                variable: null,
              };
            default:
              throw new Error('Some constructed incorrectly');
          }
        }
        default:
          throw new Error('Can only call Some: ' + functionName);
      }
    }

    switch (side.kind) {
      case SyntaxKind.NumericLiteral:
        return {
          expression: parseFloat(side.getText()),
          shouldBeUnary: false,
          variable: null,
        };

      case SyntaxKind.StringLiteral:
        return {
          expression: side.getText(),
          shouldBeUnary: false,
          variable: null,
        };

      case SyntaxKind.TrueKeyword:
        return {
          expression: true,
          shouldBeUnary: false,
          variable: null,
        };

      case SyntaxKind.FalseKeyword:
        return {
          expression: false,
          shouldBeUnary: false,
          variable: null,
        };

      case SyntaxKind.UndefinedKeyword:
        return {
          expression: undefined,
          shouldBeUnary: false,
          variable: null,
        };

      case SyntaxKind.NullKeyword:
        return {
          expression: null,
          shouldBeUnary: false,
          variable: null,
        };
    }

    /*  case 'UnaryExpression':
  const unary = side as UnaryExpression;
  if (unary.operator !== '!') {
    throw new Error(`Unary expression must be not (!) : ${JSON.stringify(unary)}`);
  }
  return {
    expression: {$not: this.parseSide(unary.argument, variableNames)},
    shouldBeUnary: false,
    variable: null,
  };*/

    throw new Error(
      `Side must either be an Identifier, Member Expression, or Literal: ${side.kind} ${side.getText(this.sourceFile)}`
    );
  }

  flattenObject(member: LeftHandSideExpression | PrefixUnaryExpression, variableNames: string[]): string {
    switch (member.kind) {
      case ts.SyntaxKind.Identifier:
        return (member as Identifier).text;
      case ts.SyntaxKind.LiteralType:
        throw new Error('Array indexing is not supported yet.');
      case ts.SyntaxKind.PrefixUnaryExpression:
        if ((member as PrefixUnaryExpression).operator !== SyntaxKind.MinusToken) {
          throw new Error('Array index can only be -1: ');
        }
        return '$ARRAY_QUERY$';
      case ts.SyntaxKind.PropertyAccessExpression:
        const property = member as PropertyAccessExpression;
        const name = this.flattenObject(property.expression, variableNames);
        const identifier = this.flattenObject(property.name, variableNames);
        if (identifier === '$ARRAY_QUERY$') {
          // for array indexer
          return name;
        }
        return `${name}.${identifier}`;
    }

    throw new Error('Object can only be of type Identifier or MemberExpression: ' + member.getText(this.sourceFile));
  }

  start(arrow: ts.ArrowFunction) {
    return this.parseBody(arrow.body as Expression, [(arrow.parameters[0].name as Identifier).escapedText as string]);
  }
}

export default function(program: ts.Program, pluginOptions: {}) {
  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visitor(node: ts.Node): ts.Node {
        if (ts.isArrowFunction(node)) {
          const parent = node.parent;
          if (parent && ts.isCallExpression(node.parent)) {
            const parseName = parent.getChildAt(0);
            if (ts.isPropertyAccessExpression(parseName)) {
              if (parseName.name.escapedText === 'parse') {
                const queryName = parseName.getChildAt(0);
                if (ts.isPropertyAccessExpression(queryName)) {
                  if (queryName.name.escapedText === 'query') {
                    const dbName = queryName.getChildAt(0);
                    if (ts.isPropertyAccessExpression(dbName)) {
                      if (dbName.name.escapedText === 'db') {
                        return parseArrow(node, sourceFile);
                      }
                    }
                  }
                }
              }
            }
          }
        }

        return ts.visitEachChild(node, visitor, ctx);
      }
      return ts.visitEachChild(sourceFile, visitor, ctx);
    };
  };
}

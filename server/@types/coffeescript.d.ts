declare module "coffeescript" {
  export function nodes(source: string, options?: any): CoffeeParser.Node;
}

declare namespace CoffeeParser {
  interface LocationData {
    first_line: number,
    first_column: number,
    last_line: number,
    last_column: number
  }


  interface Access {
    name: PropertyName,
    soak: boolean,
    locationData: LocationData
  }

  interface Value {
    base: {
      value: ThisLiteral | string | number | boolean | null,
      locationData: LocationData
    },
    properties: Access[],
    isDefaultValue: boolean,
    locationData: LocationData
  }

  interface FuncGlyph { glyph: string, locationData: LocationData }
  interface IdentifierLiteral { value: string, locationData: LocationData }
  interface ThisLiteral { value: string, locationData: LocationData }
  interface PropertyName { value: string, locationData: LocationData }

  interface Param {
    name: IdentifierLiteral,
    value: Value | undefined,
    splat: string | undefined,
    locationData: LocationData
  }

  interface Code {
    funcGlyph: FuncGlyph,
    params: Param[],
    body: Block,
    bound: boolean,
    isGenerator: boolean,
    isAsync: boolean,
    isMethod: boolean,
    locationData: LocationData
  }

  interface Node {
    expressions: Node[],
    variable: Value,
    value: Value | Code | null,
    parent: Node | null,
    body: Node | null,
    locationData: LocationData
    traverseChildren(crossScope: boolean, func: (child: Node) => void): void
  }

  interface Block {
    expressions: Node[],
    locationData: LocationData
  }
}

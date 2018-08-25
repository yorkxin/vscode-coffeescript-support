declare module "coffeescript" {
  import { Block } from "coffeescript/lib/coffeescript/nodes"
  export function nodes(source: string, options?: any): Block;
}

// http://coffeescript.org/annotated-source/nodes.html
declare module "coffeescript/lib/coffeescript/nodes" {
  import { Scope } from "coffeescript/lib/coffeescript/scope"

  interface AbstractO {
    index: number,
    level: number,
    indent: number,
    sharedScope: boolean,
    scope?: Scope
  }

  type ChildKind = 'accessor' | 'alias' | 'args' | 'array' | 'attempt' | 'base' | 'body' |
                   'cases' | 'child' | 'class' | 'clause' | 'condition' | 'defaultBinding' |
                   'elseBody' | 'ensure' | 'expression' | 'expressions' | 'first' | 'from' |
                   'guard' | 'index' | 'name' | 'namedImports' | 'object' | 'objects' | 'original' |
                   'otherwise' | 'params' | 'parent' | 'properties' | 'range' | 'recovery' | 'second' |
                   'source' | 'specifiers' | 'step' | 'subject' | 'to' | 'value' | 'variable'

  /**
   * The various nodes defined below all compile to a collection of **CodeFragment** objects.
   * A CodeFragments is a block of generated code, and the location in the source file where the code
   * came from. CodeFragments can be assembled together into working code just by catting together
   * all the CodeFragments' `code` snippets, in order.
   */
  export class CodeFragment {
    locationData: LocationData
    toString(): string
  }

  /**
   * The **Base** is the abstract base class for all nodes in the syntax tree.
   * Each subclass implements the `compileNode` method, which performs the
   * code generation for that node. To compile a node to JavaScript,
   * call `compile` on it, which wraps `compileNode` in some generic extra smarts,
   * to know when the generated code needs to be wrapped up in a closure.
   * An options hash is passed and cloned throughout, containing information about
   * the environment from higher in the tree (such as if a returned value is
   * being requested by the surrounding function), information about the current
   * scope, and indentation level.
   */
  export abstract class Base {
    contains(pred: Base): true | undefined

    /** Pull out the last node of a node list. */
    lastNode(list: Base[]): Base | null

    /**
     * `toString` representation of the node, for inspecting the parse tree.
     * This is what `coffee --nodes` prints out.
     * @param {string?} [idt = '']
     * @param {string?} [name = this.constructor.name]
    */
    toString(idt?: string, name?: string): string

    /**
     * Passes each child to a function, breaking when the function returns `false`.
     */
    eachChild(func: (child: Base) => boolean): Base
    traverseChildren(crossScope: boolean, func: (child: Base) => boolean): void

    /**
     * `replaceInContext` will traverse children looking for a node for which `match` returns
     * true. Once found, the matching node will be replaced by the result of calling `replacement`.
     */
    replaceInContext(match: (child: Base) => boolean, replacement: (childOrChildren: Base | Base[], context: Base) => Base): boolean

    unwrapAll(): Base

    /*
     * Default implementations of the common node properties and methods. Nodes
     * will override these with custom logic, if needed.
     */

    /*
     * `children` are the properties to recurse into when tree walking. The
     * `children` list *is* the structure of the AST. The `parent` pointer, and
     * the pointer to the `children` are how you can traverse the tree.
     */
    children: ChildKind[]

    /*
     * `isStatement` has to do with “everything is an expression”. A few things
     * can’t be expressions, such as `break`. Things that `isStatement` returns
     * `true` for are things that can’t be used as expressions. There are some
     * error messages that come from `nodes.coffee` due to statements ending up
     * in expression position.
     */
    isStatement(o?: AbstractO): boolean

    /*
     * Track comments that have been compiled into fragments, to avoid outputting
     * them twice.
     */
    compiledComments: Base[]

    /*
    * `includeCommentFragments` lets `compileCommentFragments` know whether this node
    * has special awareness of how to handle comments within its output.
    */
    includeCommentFragments(): boolean

    /*
    * `jumps` tells you if an expression, or an internal part of an expression
    * has a flow control construct (like `break`, or `continue`, or `return`,
    * or `throw`) that jumps out of the normal flow of control and can’t be
    * used as a value. This is important because things like this make no sense;
    * we have to disallow them.
    */
    jumps(o?: AbstractO): boolean

    /*
    * If `node.shouldCache() is false`, it is safe to use `node` more than once.
    * Otherwise you need to store the value of `node` in a variable and output
    * that variable several times instead. Kind of like this: `5` need not be
    * cached. `returnFive()`, however, could have side effects as a result of
    * evaluating it more than once, and therefore we need to cache it. The
    * parameter is named `shouldCache` rather than `mustCache` because there are
    * also cases where we might not need to cache but where we want to, for
    * example a long expression that may well be idempotent but we want to cache
    * for brevity.
    */
    shouldCache(o?: AbstractO): boolean

    isChainable(o?: AbstractO): boolean
    isAssignable(o?: AbstractO): boolean
    isNumber(o?: AbstractO): boolean

    /** Is this node used to assign a certain variable? */
    assigns(name: string): boolean

    /*
    * `fragmentsList` is an array of arrays of fragments. Each array in fragmentsList will be
    * concatenated together, with `joinStr` added in between each, to produce a final flat array
    * of fragments.
    */
    joinFragmentArrays(fragmentsList: Base[], joinStr: string): any[]

    locationData: LocationData
  }

  /**
   * A **HoistTargetNode** represents the output location in the node tree for a hoisted node.
   * @see Base#hoist
   */
  export class HoistTarget extends Base {
    isStatement(o: AbstractO): boolean
  }

  export class Block extends Base {
    expressions: Base[]
  }

  // Literal

  /**
   * `Literal` is a base class for static values that can be passed through
   * directly into JavaScript without translation, such as: strings, numbers,
   * `true`, `false`, `null`...
   */
  export class Literal extends Base {
    value: string
  }

  export class NumberLiteral extends Literal {}
  export class InfinityLiteral extends NumberLiteral {}
  export class NaNLiteral extends NumberLiteral {}
  export class StringLiteral extends Literal {}
  export class RegexLiteral extends Literal {}
  export class PassthroughLiteral extends Literal {}
  export class IdentifierLiteral extends Literal {}
  export class CSXTag extends IdentifierLiteral {}
  export class PropertyName extends Literal {}
  export class StatementLiteral extends Literal {}
  export class ThisLiteral extends Literal {}
  export class UndefinedLiteral extends Literal {}
  export class NullLiteral extends Literal {}
  export class BooleanLiteral extends Literal {}

  /* A `return` is a *pureStatement*—wrapping it in a closure wouldn’t make sense. */
  export class Return extends Base {
    expression: Base[]
  }

  export class YieldReturn extends Return {}
  export class AwaitReturn extends Return {}

  export class Value extends Base {
    base: Obj | Literal | PropertyName | Code | Call
    properties: Assign[] | Access[]
    isDefaultValue: boolean

    shouldCache(): boolean
    assigns(name: string): boolean
    jumps(o: AbstractO): boolean

    isAssignable(): boolean
    isStatement(o: AbstractO): boolean

    hasProperties(): boolean
    isArray(): boolean
    isRange(): boolean
    isNumber(): boolean
    isString(): boolean
    isRegex(): boolean
    isUndefined(): boolean
    isNull(): boolean
    isBoolean(): boolean
    isAtomic(): boolean
    isNotCallable(): boolean
    isObject(onlyGenerated: boolean): boolean
    isSplice(): boolean
    looksStatic(className: string): boolean
  }

  export class HereComment extends Base {
    content: string
    newLine: boolean
    unshift: boolean
  }

  export class LineComment extends Base {
    content: string
    newLine: boolean
    unshift: boolean
  }

  export class Call extends Base {
    variable: Value
    args: Param[]
    // soak: boolean
    // token: Token

    isNew: boolean
    csx: boolean
  }

  export class SuperCall extends Call {
  }

  export class Super extends Base {
    ancestor: Base
  }

  export class RegexWithInterpolations extends Call {}
  export class TaggedTemplateCall extends Call {}

  export class Extends extends Base {
    child: IdentifierLiteral
    parent: IdentifierLiteral
  }

  export class Access extends Base {
    name: IdentifierLiteral | PropertyName
  }

  export class Index extends Base {
    index: Value
  }

  export class Range extends Base {
    from: Value
    to: Value
  }

  export class Slice extends Base {
    range: Range
  }

  export class Obj extends Base {
    generated: boolean
    lhs: boolean
    objects: PropertyName[]
    properties: Assign[]
    hasSplat(): boolean
  }

  export class Arr extends Base {
    lhs: boolean
    objects: PropertyName[]
  }

  export class Class extends Base {
    variable: Value
    parent: Base
    body: Block
  }

  /** import and export */
  export class ModuleDeclaration extends Base {
    clause: Base
    source: string
  }

  export class ImportDeclaration extends ModuleDeclaration {}
  export class ImportClause extends Base {
    defaultBinding: Base
    namedImports: Base
  }

  export class ExportDeclaration extends ModuleDeclaration {}
  export class ExportNamedDeclaration extends ExportDeclaration {}
  export class ExportDefaultDeclaration extends ExportDeclaration {}
  export class ExportAllDeclaration extends ExportDeclaration {}

  export class ModuleSpecifierList extends Base {
    specifiers: ModuleSpecifier[]
  }
  export class ImportSpecifierList extends ModuleSpecifierList {}
  export class ExportSpecifierList extends ModuleSpecifierList {}
  export class ModuleSpecifier extends Base {
    original: Base
    alias: Base
  }

  export class ImportSpecifier extends ModuleSpecifier {}
  export class ImportNamespaceSpecifier extends ImportSpecifier {}
  export class ExportSpecifier extends ModuleSpecifier {}

  class Assign extends Base {
    variable?: Value
    value: Value | Code
    context: string
    options: {
      param: string
      subpattern: string
      operatorToken: string
      moduleDeclaration: 'import' | 'export'
    }
  }

  export class FuncGlyph extends Base {
    glyph: '->' | '=>'
  }

  export class Code extends Base {
    params: Param[]
    body: Block
    funcGlyph: FuncGlyph
    bound: boolean
    isGenerator: boolean
    isAsync: boolean
    isMethod: boolean
  }

  export class Param extends Base {
    name: Literal | Value
    value?: Value
    splat?: Splat
  }

  export class Splat extends Base {
    name: Literal
  }

  export class Expansion extends Base {}

  export class While extends Base {
    condition: Base
    guard: Base
    body: Block
  }

  export class Op extends Base {
    first: string
    sencond: string
  }

  export class In extends Base {
    object: Base
    array: Base
  }

  export class Try extends Base {
    attempt: Block
    recovery: Block
    ensure: Block
  }

  export class Throw extends Base {
    expression: Base
  }

  export class Existence extends Base {
    expression: Base
  }

  export class Parens extends Base {
    body: Base
  }

  export class StringWithInterpolations extends Base {
    body: Base
  }

  export class For extends While {
    body: Block
    source: Base
    guard: Base
    step: Base
  }

  export class Switch extends Base {
    subject: Base
    cases: Base
    otherwise: Base
  }

  export class If extends Base {
    condition: Base
    body: Block
    elseBody: Block
  }

  export interface LocationData {
    first_line: number,
    first_column: number,
    last_line: number,
    last_column: number
  }
}

declare module "coffeescript/lib/coffeescript/scope" {
  export class Scope {
    variables: { name: string, type: string}[]
    positions: any
    utilities?: any
  }
}

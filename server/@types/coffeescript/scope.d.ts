declare module "coffeescript/lib/coffeescript/scope" {
  export class Scope {
    variables: { name: string, type: string}[]
    positions: any
    utilities?: any
  }
}

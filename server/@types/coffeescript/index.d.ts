declare module "coffeescript" {
  import { Base } from "coffeescript/lib/coffeescript/nodes"
  export function nodes(source: string, options?: any): Base;
}

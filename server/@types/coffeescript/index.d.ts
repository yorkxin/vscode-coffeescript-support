declare module "coffeescript" {
  import { Block } from "coffeescript/lib/coffeescript/nodes"
  export function nodes(source: string, options?: any): Block;
}

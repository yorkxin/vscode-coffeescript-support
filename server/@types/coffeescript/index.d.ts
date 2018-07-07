declare module "coffeescript" {
  import { Block } from "coffeescript/nodes"
  export function nodes(source: string, options?: any): Block;
}

/// <reference path="../@types/coffeescript/index.d.ts"/>
import * as CoffeeScript from 'coffeescript'
import { Base } from 'coffeescript/lib/coffeescript/nodes'

export default class Parser {
  static parse(filename: string): Base {
    return CoffeeScript.nodes(filename)
  }
}

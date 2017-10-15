/// <reference path="../@types/coffeescript.d.ts"/>
import * as CoffeeScript from 'coffeescript'

export default class Parser {
  static parse(filename: string) {
    return CoffeeScript.nodes(filename)
  }
}

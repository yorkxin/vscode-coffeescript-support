import * as CoffeeScript from 'coffeescript'

import { readFileByURI } from "../utils/fileReader"

import { DiagnosticSeverity, Diagnostic } from "vscode-languageserver"

export default function(uri: string): Diagnostic[] {
  let src = readFileByURI(uri)

  try {
    CoffeeScript.nodes(src)
    return []
  } catch (error) {
    let range = {
      start: { line: error.location.first_line, character: error.location.first_column },
      end: { line: error.location.last_line, character: error.location.last_column }
    }
    return [{
      severity: DiagnosticSeverity.Error,
      range: range,
      message: `${range.start.line+1}:${range.start.character+1} ${error.message}`,
      source: 'coffee'
    }]
  }
}

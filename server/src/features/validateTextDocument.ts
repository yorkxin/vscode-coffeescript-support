import * as CoffeeScript from 'coffeescript'

import { DiagnosticSeverity, Diagnostic, Range } from "vscode-languageserver"

export function validateTextDocument(src: string): Diagnostic[] {
  try {
    CoffeeScript.nodes(src)
    return []
  } catch (error) {
    const range = Range.create(error.location.first_line, error.location.first_column, error.location.last_line, error.location.last_column)
    return [{
      severity: DiagnosticSeverity.Error,
      range: range,
      message: `${range.start.line+1}:${range.start.character+1} ${error.message}`,
      source: 'coffee'
    }]
  }
}

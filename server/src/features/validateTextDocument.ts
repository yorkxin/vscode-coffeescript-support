import * as CoffeeScript from 'coffeescript'

import { DiagnosticSeverity, Diagnostic, Range } from "vscode-languageserver"

export function validateTextDocument(src: string): Diagnostic[] {
  try {
    CoffeeScript.nodes(src)
    return []
  } catch (error) {
    const startLine = error.location.first_line
    const startChar = error.location.first_column
    let endLine = error.location.last_line
    const endChar = error.location.last_column

    // In some cases error.location.last_line is undefined but actually points to the same line.
    if (endLine === undefined) {
      endLine = startLine
    }

    const range = Range.create(startLine, startChar, endLine, endChar)

    return [{
      severity: DiagnosticSeverity.Error,
      range: range,
      message: `${range.start.line+1}:${range.start.character+1} ${error.message}`,
      source: 'coffee'
    }]
  }
}

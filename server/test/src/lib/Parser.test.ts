import { Parser } from '../../../src/lib/Parser';
import { DiagnosticSeverity, Diagnostic } from "vscode-languageserver/lib/main";

describe('validateTextDocument()', () => {
  test('returns no diagnostic when no error', () => {
    const src = "class Annoymous"
    const parser = new Parser()
    expect(parser.validateSource(src)).toHaveLength(0)
  })

  test('returns diagnostics when there are errors', () => {
    const src = "a ="
    const expected: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: { start: { line: 0, character: 3 }, end: { line: 0, character: 3 }},
      message: "1:4 unexpected end of input",
      source: 'coffee'
    }

    const parser = new Parser()
    expect(parser.validateSource(src)).toEqual([expected])
  })
})

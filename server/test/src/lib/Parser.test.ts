import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '../../../src/lib/Parser';
import { DiagnosticSeverity, Diagnostic, SymbolKind, SymbolInformation } from "vscode-languageserver/lib/main";

describe('Parser', () => {
  describe('validateSource()', () => {
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

  describe('getSymbolsFromSource()', () => {
    test('returns all symbols including those in closure', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-1.coffee')).toString();
      const symbols = parser.getSymbolsFromSource(src)

      expect(symbols).toEqual([
        { name: 'Foo', kind: SymbolKind.Class, location: { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 8 } }, uri: null } },
        { name: 'Bar', kind: SymbolKind.Variable, location: { range: { start: { line: 2, character: 0 }, end: { line: 2, character: 10 } }, uri: null } },
        { name: 'Baz', kind: SymbolKind.Variable, location: { range: { start: { line: 4, character: 0 }, end: { line: 4, character: 8 } }, uri: null } },
        { name: 'module.exports.Foo', kind: SymbolKind.Variable, location: { range: { start: { line: 6, character: 0 }, end: { line: 6, character: 23 } }, uri: null } },
        { name: 'module.exports.Bar', kind: SymbolKind.Variable, location: { range: { start: { line: 7, character: 0 }, end: { line: 7, character: 23 } }, uri: null } },
      ])
    })

    test.skip('returns only global symbols if asked', () => {
    })
  });
});

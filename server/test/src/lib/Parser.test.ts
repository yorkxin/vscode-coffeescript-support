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
    test('works for named export', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-1.coffee')).toString();
      const symbols = parser.getSymbolsFromSource(src)

      expect(symbols).toEqual([
        { name: 'Foo', kind: SymbolKind.Class, location: expect.anything() },
        { name: 'Bar', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'Baz', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for default export', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-2.coffee')).toString();
      const symbols = parser.getSymbolsFromSource(src)

      expect(symbols).toEqual([
        { name: 'Foo', kind: SymbolKind.Variable, location: expect.anything() },
        // FIXME: module.exports should be Class
        { name: 'module.exports', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for global variables', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/globals.coffee')).toString();
      const symbols = parser.getSymbolsFromSource(src)

      expect(symbols).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge", kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })
  });

  describe('getExportedSymbolsFromSource()', () => {
    test('works for named export', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-1.coffee')).toString();
      const symbols = parser.getExportedSymbolsFromSource(src)

      expect(symbols).toEqual([
        { name: 'module.exports.Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for default export', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-2.coffee')).toString();
      const symbols = parser.getExportedSymbolsFromSource(src)

      expect(symbols).toEqual([
        // FIXME: module.exports should be Class
        { name: 'module.exports', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for global variables', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/globals.coffee')).toString();
      const symbols = parser.getExportedSymbolsFromSource(src)

      expect(symbols).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge", kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for a complex sample file', () => {
      const parser = new Parser()
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/sample.coffee')).toString();
      const symbols = parser.getExportedSymbolsFromSource(src)

      expect(symbols).toEqual([
        { name: "module.exports", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "module.exports.KONSTANT", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "exports.abc", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "exports.foo", kind: SymbolKind.Namespace, location: expect.anything() },
        { name: "exports.bar", kind: SymbolKind.Namespace, location: expect.anything() },
      ])
    })
  })
});

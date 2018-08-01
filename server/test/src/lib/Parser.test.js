const fs = require('fs');
const path = require('path');
const { Parser } = require('../../../src/lib/Parser');
const { DiagnosticSeverity, SymbolKind } = require("vscode-languageserver/lib/main");

describe('Parser', () => {
  describe('validateSource()', () => {
    test('returns no diagnostic when no error', () => {
      const src = "class Annoymous"
      const parser = new Parser()
      expect(parser.validateSource(src)).toHaveLength(0)
    })

    test('returns diagnostics when there are errors', () => {
      const src = "a ="
      const expected = {
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 0, character: 3 }, end: { line: 0, character: 3 }},
        message: "1:4 unexpected end of input",
        source: 'coffee'
      }

      const parser = new Parser()
      expect(parser.validateSource(src)).toEqual([expected])
    })
  })

  describe('Parser in "includeClosure = true" mode', () => {
    test('works for named export', () => {
      const parser = new Parser({ includeClosure: true })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-1.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: 'Foo', kind: SymbolKind.Class, location: expect.anything() },
        { name: 'Bar', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'Baz', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: 'module.exports.Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for default export', () => {
      const parser = new Parser({ includeClosure: true })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-2.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: 'Foo', kind: SymbolKind.Variable, location: expect.anything() },
        // FIXME: module.exports should be Class
        { name: 'module.exports', kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        // FIXME: module.exports should be Class
        { name: 'module.exports', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for global variables', () => {
      const parser = new Parser({ includeClosure: true })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/globals.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "x", kind: SymbolKind.Variable, containerName: "Baz()", location: expect.anything() },
        { name: "Hogehoge", kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge", kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for top level function call', () => {
      const parser = new Parser({ includeClosure: true })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/top-level-function-call.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "value", kind: SymbolKind.Namespace, containerName: '[anonymous]', location: expect.anything() },
        { name: "type", kind: SymbolKind.Variable, containerName: '[anonymous].value', location: expect.anything() },
        { name: "click(target)", kind: SymbolKind.Function, containerName: '[anonymous]', location: expect.anything() },
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })
  });

  describe('Parser in "includeClosure = false" mode', () => {
    test('works for named export', () => {
      const parser = new Parser({ includeClosure: false })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-1.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: 'Foo', kind: SymbolKind.Class, location: expect.anything() },
        { name: 'Bar', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'Baz', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: 'module.exports.Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for default export', () => {
      const parser = new Parser({ includeClosure: false })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-2.coffee')).toString();
      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "module.exports", kind: SymbolKind.Variable, location: expect.anything() },
      ]);

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        // FIXME: module.exports should be Class
        { name: 'module.exports', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for global variables', () => {
      const parser = new Parser({ includeClosure: false })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/globals.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge", kind: SymbolKind.Variable, location: expect.anything() },
      ]);

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge", kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for top level function call', () => {
      const parser = new Parser({ includeClosure: false })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/top-level-function-call.coffee')).toString();
      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "value", kind: SymbolKind.Namespace, containerName: '[anonymous]', location: expect.anything() },
        { name: "type", kind: SymbolKind.Variable, containerName: '[anonymous].value', location: expect.anything() },
        { name: "click(target)", kind: SymbolKind.Function, containerName: '[anonymous]', location: expect.anything() },
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
      ]);

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for a complex sample file', () => {
      const parser = new Parser({ includeClosure: false })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/sample.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "A", kind: SymbolKind.Package, location: expect.anything()},
        // FIXME: { b } = require() should be included here
        { name: "GLOBAL_A", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "GLOBAL_B", kind: SymbolKind.Namespace, location: expect.anything()},
        { name: "varA", kind: SymbolKind.Variable, containerName: "GLOBAL_B", location: expect.anything()},
        { name: "varB", kind: SymbolKind.Variable, containerName: "GLOBAL_B", location: expect.anything()},
        { name: "func(abc)", kind: SymbolKind.Function, containerName: "GLOBAL_B", location: expect.anything()},
        { name: "globalFunc()", kind: SymbolKind.Function, location: expect.anything()},
        // FIXME: class App below should have constructor parameters (@iVar, options)
        { name: "App", kind: SymbolKind.Class, location: expect.anything()},
        // FIXME: class App's instance methods should be included ehre
        // FIXME: class App's static methods should be included here
        { name: "value", kind: SymbolKind.Namespace, containerName: "[anonymous]", location: expect.anything()},
        { name: "type", kind: SymbolKind.Variable, containerName: "[anonymous].value", location: expect.anything()},
        { name: "click(target)", kind: SymbolKind.Function, containerName: "[anonymous]", location: expect.anything()},
        // FIXME: class Apuri below should have constructor parameters (@iVar, options)
        { name: "Apuri", kind: SymbolKind.Class, location: expect.anything()},
        { name: "Apuri::sayhi()", kind: SymbolKind.Function, location: expect.anything()},
        { name: "@::foo()", kind: SymbolKind.Function, location: expect.anything()},
        { name: "Afuri", kind: SymbolKind.Class, location: expect.anything()},
        { name: "human", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "module.exports", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "module.exports.KONSTANT", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "exports.abc", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "exports.foo", kind: SymbolKind.Namespace, location: expect.anything()},
        { name: "exports.bar", kind: SymbolKind.Namespace, location: expect.anything()},
        { name: "baz", kind: SymbolKind.Variable, containerName: "exports.bar", location: expect.anything()}
      ]);

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "module.exports", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "module.exports.KONSTANT", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "exports.abc", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "exports.foo", kind: SymbolKind.Namespace, location: expect.anything() },
        { name: "exports.bar", kind: SymbolKind.Namespace, location: expect.anything() },
        { name: "baz", kind: SymbolKind.Variable, containerName: 'exports.bar', location: expect.anything() },
      ])
    })
  })
});

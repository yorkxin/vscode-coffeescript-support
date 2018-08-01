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
        { name: 'module.exports.Foo = Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar = Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: 'Foo', kind: SymbolKind.Class, location: expect.anything() },
        { name: 'Bar', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Foo = Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar = Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for default export', () => {
      const parser = new Parser({ includeClosure: true })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-2.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: 'Foo', kind: SymbolKind.Variable, location: expect.anything() },
        // FIXME: module.exports should be Class
        { name: 'module.exports = Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        // FIXME: module.exports should be Class
        { name: 'module.exports = Bar', kind: SymbolKind.Variable, location: expect.anything() },
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
        { name: "Hogehoge = Bar", kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge = Bar", kind: SymbolKind.Variable, location: expect.anything() },
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
        { name: 'module.exports.Foo = Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar = Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: 'Foo', kind: SymbolKind.Class, location: expect.anything() },
        { name: 'Bar', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Foo = Foo', kind: SymbolKind.Variable, location: expect.anything() },
        { name: 'module.exports.Bar = Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for default export', () => {
      const parser = new Parser({ includeClosure: false })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/export-2.coffee')).toString();
      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "module.exports = Bar", kind: SymbolKind.Variable, location: expect.anything() },
      ]);

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        // FIXME: module.exports should be Class
        { name: 'module.exports = Bar', kind: SymbolKind.Variable, location: expect.anything() },
      ])
    })

    test('works for global variables', () => {
      const parser = new Parser({ includeClosure: false })
      const src = fs.readFileSync(path.resolve(__dirname, '../../fixtures/globals.coffee')).toString();

      expect(parser.getSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge = Bar", kind: SymbolKind.Variable, location: expect.anything() },
      ]);

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "Foo", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Bar", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "Baz()", kind: SymbolKind.Function, location: expect.anything() },
        { name: "Hogehoge = Bar", kind: SymbolKind.Variable, location: expect.anything() },
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
        { name: "FOO", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "BAR", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "BAZ", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "num", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "inf", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "nan", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "str", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "regex", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "undef", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "nuru", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "bool", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "a", kind: SymbolKind.Namespace, containerName: "App", location: expect.anything()},
        { name: "b", kind: SymbolKind.Variable, containerName: "App.a", location: expect.anything()},
        { name: "constructor(@iVar, options)", kind: SymbolKind.Method, containerName: "App", location: expect.anything()},
        { name: "doSomething(a, b, c)", kind: SymbolKind.Method, containerName: "App", location: expect.anything()},
        { name: "@doAnother(a, b, c)", kind: SymbolKind.Method, containerName: "App", location: expect.anything()},
        { name: "yo", kind: SymbolKind.Namespace, containerName: "App", location: expect.anything()},
        { name: "ho", kind: SymbolKind.Namespace, containerName: "App.yo", location: expect.anything()},
        { name: "xo", kind: SymbolKind.Variable, containerName: "App.yo.ho", location: expect.anything()},
        { name: "lol", kind: SymbolKind.Namespace, containerName: "App", location: expect.anything()},
        { name: "mo(a, b)", kind: SymbolKind.Function, containerName: "App.lol", location: expect.anything()},
        { name: "value", kind: SymbolKind.Namespace, containerName: "[anonymous]", location: expect.anything()},
        { name: "type", kind: SymbolKind.Variable, containerName: "[anonymous].value", location: expect.anything()},
        { name: "click(target)", kind: SymbolKind.Function, containerName: "[anonymous]", location: expect.anything()},
        // FIXME: class Apuri below should have constructor
        { name: "Apuri", kind: SymbolKind.Class, location: expect.anything()},
        { name: "constructor()", kind: SymbolKind.Method, containerName: "Apuri", location: expect.anything()},
        { name: "Apuri::sayhi()", kind: SymbolKind.Function, location: expect.anything()},
        { name: "@::foo()", kind: SymbolKind.Function, location: expect.anything()},
        { name: "Afuri", kind: SymbolKind.Class, location: expect.anything()},
        { name: "human = (Anonymous Class)", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "module.exports = App", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "module.exports.KONSTANT", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "exports.abc = def", kind: SymbolKind.Variable, location: expect.anything()},
        { name: "exports.foo", kind: SymbolKind.Namespace, location: expect.anything()},
        { name: "exports.bar", kind: SymbolKind.Namespace, location: expect.anything()},
        { name: "baz", kind: SymbolKind.Variable, containerName: "exports.bar", location: expect.anything()}
      ]);

      expect(parser.getExportedSymbolsFromSource(src)).toEqual([
        { name: "App", kind: SymbolKind.Class, location: expect.anything()},
        { name: "FOO", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "BAR", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "BAZ", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "num", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "inf", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "nan", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "str", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "regex", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "undef", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "nuru", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "bool", kind: SymbolKind.Variable, containerName: "App", location: expect.anything()},
        { name: "a", kind: SymbolKind.Namespace, containerName: "App", location: expect.anything()},
        { name: "b", kind: SymbolKind.Variable, containerName: "App.a", location: expect.anything()},
        { name: "constructor(@iVar, options)", kind: SymbolKind.Method, containerName: "App", location: expect.anything()},
        { name: "doSomething(a, b, c)", kind: SymbolKind.Method, containerName: "App", location: expect.anything()},
        { name: "@doAnother(a, b, c)", kind: SymbolKind.Method, containerName: "App", location: expect.anything()},
        { name: "yo", kind: SymbolKind.Namespace, containerName: "App", location: expect.anything()},
        { name: "ho", kind: SymbolKind.Namespace, containerName: "App.yo", location: expect.anything()},
        { name: "xo", kind: SymbolKind.Variable, containerName: "App.yo.ho", location: expect.anything()},
        { name: "lol", kind: SymbolKind.Namespace, containerName: "App", location: expect.anything()},
        { name: "mo(a, b)", kind: SymbolKind.Function, containerName: "App.lol", location: expect.anything()},
        { name: "module.exports = App", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "module.exports.KONSTANT", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "exports.abc = def", kind: SymbolKind.Variable, location: expect.anything() },
        { name: "exports.foo", kind: SymbolKind.Namespace, location: expect.anything() },
        { name: "exports.bar", kind: SymbolKind.Namespace, location: expect.anything() },
        { name: "baz", kind: SymbolKind.Variable, containerName: 'exports.bar', location: expect.anything() },
      ])
    })
  })
});

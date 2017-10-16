A = require('lib_a')
{ b } = require('lib_b')

GLOBAL_A = 'abc'
GLOBAL_B = {
  varA: 1
  varB: 2
  func: (abc) -> 42
}

globalFunc = () -> true

class App
  FOO: 'bar'
  BAR = 'baz'
  a:
    b: 3

  constructor: (@iVar, options) ->
    # defining instant vars
    @id = "1234"
    @name = @hello = "Hello World"
    @hash = {}
    @hash['shouldNotAppear'] = {}

  doSomething: (a, b, c = 1) ->

    # local
    shouldNotAppear = a + b + c

    # accessing instance var
    @houldNotAppear = 3

    @access = array[3]
    @range = [1..2]

  # static func
  @doAnother: (a, b, c) -> true

  yo:
    ho:
      xo: [
        1, 2, 3
      ]

  lol:
    mo: (a, b) =>
      return a + b


class Apuri extends App
  constructor: () ->
    super(123)

# static func
Apuri::sayhi = ->

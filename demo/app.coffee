class App
  FOO: 'bar'
  BAR = 'baz'

  constructor: () ->
    @name = @hello = "Hello World"
    @id = "1234"

  doSomething: (a, b, c = 1) ->
    a + b + c

    @name = 3
    @xxx = 1

  yo:
    ho:
      xo: [
        1, 2, 3
      ]

  lol:
    mo: (a, b) =>
      return a + b

LAR = 'hay'

mos = () =>

class Apuri extends App

Apuri::sayhi = ->

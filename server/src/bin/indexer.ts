import * as program from "commander";
import { SymbolIndex } from "../lib/SymbolIndex"

program
  .option('-d, --db <db>', 'DB File name')
  .parse(process.argv);

if (!program.db) {
  program.outputHelp()
  process.exit(1)
}

const symbolIndex = new SymbolIndex(program.db)

process.stdin.setEncoding('utf-8')

process.stdin.on('data', (data) => {
  const filename = data.toString().replace(/\n/, '')
  symbolIndex.indexFile(filename)
})

process.on('message', (params) => {
  if (params.files) {
    Promise.all(params.files.map((file:string) => {
      return symbolIndex.indexFile(file)
    })).then(() => {
      process.send({ done: true })
    })
  }
})

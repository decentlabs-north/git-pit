#!/usr/bin/env node

(async () => { // reluctant blackmagic
  const { Command } = await import('commander')
  const {
    init,
    seed,
    clone
  } = await import('./index.js')

  const program = new Command()

  program
    .description(bq`
      Makes git make sense.

      This tool is alpha.
      Help appreciated:
      - https://github.com/decentlabs-north/git-pit/
      - https://discord.gg/8RMRUPZ9RS
    `)

  program.command('init')
    .description(bq`
      Initialize pit in your repository:
        - become Maintainer when used in plain git repo.
        - become Contributor when used in existing git+pit repo.
    `)
    .action(async () => {
      const repo = process.cwd()
      const key = await init(repo)
      console.error('Initialized Pit as Maintainer, share:')
      console.log(key)
    })

  program.command('clone')
    .description('Clone a pit repo')
    .argument('<key>', 'Maintainer key')
    .argument('<path>', 'Destination folder')
    .action(async (key, path) => {
      const stats = await clone(key, path)
      console.log(stats)
    })

  program.command('sync')
    .description('Replaces git push and pull')
    .action(() => console.error('Not Implemented'))

  program.command('seed')
    .description('Alias to "sync --live"')
    .action(async () => {
      await seed(process.cwd()) // returns stopFn
      console.error('Seeding:')
      // TODO: console.log(mainKey)
      console.error('Press Ctrl+c to stop')
    })

  program.command('add')
    .description('Add contributor to repo')
    .argument('<key>', 'Contributor key')
    .action(() => console.error('Not Implemented'))

  await program.parseAsync()
})()

function bq (str, ...tokens) {
  str = [...str]
  for (let i = tokens.length; i > 0; i--) str.splice(i, 0, tokens.pop())
  return str.join('').split('\n').map(t => t.trim()).join('\n').trim()
}

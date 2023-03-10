import { test } from 'tapzero'
// import Corestore from 'corestore'
import {
  exec,
  init,
  clone,
  seed,
  info,
  sync,
  add,
  isGitRepo,
  isPitRepo,
  isMaintainer,
  isContributor
} from './index.js'

test('exec', async t => {
  const out = await exec('echo hello')
  t.equal(out.trim(), 'hello')
})

test('init and clone', async t => {
  await exec('rm -rf ./tmp/')
  const keyA = await spawnMaintainer('./tmp/a')
  t.equal(await isGitRepo('./tmp/a'), true)
  t.equal(await isPitRepo('./tmp/a'), true)
  t.equal(await isMaintainer('./tmp/a'), true)
  t.equal(await isContributor('./tmp/a'), false)

  const stopA = await seed('./tmp/a')

  await clone(keyA, './tmp/c')
  t.equal(await isGitRepo('./tmp/c'), true)
  t.equal(await isPitRepo('./tmp/c'), true)
  t.equal(await isMaintainer('./tmp/c'), false)
  t.equal(await isContributor('./tmp/c'), false)
  await stopA()
  await exec('rm -rf ./tmp/')
})

test.skip('Test add contributor', async t => {
  await exec('rm -rf ./tmp/')
  const keyA = await spawnMaintainer('./tmp/a')
  const stopA = await seed('./tmp/a')

  const keyB = await spawnContributor(keyA, './tmp/b', 'bob')
  await spawnCommit('./tmp/b', 'B stands for best')
  await add('./tmp/a', keyB)
  await sync('./tmp/b')

  const keyC = await spawnContributor(keyA, './tmp/c', 'charlie')
  await add('./tmp/a', keyC)
  await sync('./tmp/c')

  let i = await info('./tmp/a')
  t.ok(i.key.equals(keyA), 'Key A is main key')
  t.ok(i.peers.find(d => d.key.equals(keyB)), 'Cont B included')
  t.ok(i.peers.find(d => d.key.equals(keyC)), 'Cont C included')

  i = await info('./tmp/b')
  t.ok(i.key.equals(keyA), 'Key A is main key')
  t.ok(i.peers.find(d => d.key.equals(keyB)), 'Cont B included')
  t.ok(i.peers.find(d => d.key.equals(keyC)), 'Cont C included')

  i = await info('./tmp/c')
  t.ok(i.key.equals(keyA), 'Key A is main key')
  t.ok(i.peers.find(d => d.key.equals(keyB)), 'Cont B included')
  t.ok(i.peers.find(d => d.key.equals(keyC)), 'Cont C included')
  await stopA()
})

async function spawnMaintainer (repo, name) {
  await exec(`mkdir -p ${repo}`)
  await exec('git init .', { cwd: repo })
  await exec(`echo 'First insert: ${name}' >> README.md`, { cwd: repo })
  await exec('git add README.md', { cwd: repo })
  await exec('git commit -am "First commit"', { cwd: repo })

  return await init(repo)
}

async function spawnContributor (key, repo, name) {
  // Clone as seeder
  await clone(key, repo)
  // Upgrade to contributor.
  return await init(repo, { name })
}

async function spawnCommit (repo, appendLine) {
  // TODO: not implemented
  await exec(`echo '${appendLine}' >> README.md`, { cwd: repo })
  await exec(`git commit -am 'Added ${appendLine}'`, { cwd: repo })
}

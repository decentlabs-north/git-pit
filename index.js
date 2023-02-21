// SPDX-License-Identifier: AGPL-3.0-or-later
import { exec as nExec } from 'node:child_process'
import {
  mkdir,
  stat as nstat,
  writeFile,
  appendFile,
  readFile
} from 'node:fs/promises'
import { join, normalize, relative } from 'node:path'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import MirrorDrive from 'mirror-drive'
import Localdrive from 'localdrive'
import Hyperswarm from 'hyperswarm'

const MAIN_DIR = '.pit/repos/main/'
const REPOS_DIR = '.pit/repos'
const CORESTORE_DIR = '.pit/corestore'
const AUTHORS_FILE = '.git/authors'
const PEER_FILE = '.git/peer'
// const MERGE_REQUEST_DIR = '.git/merge_requests' // out of scope for now.
const D = console.error

export async function exec (cmd, opts = {}) {
  D('pit>', cmd)
  return new Promise((resolve, reject) => {
    nExec(cmd, opts, (error, stdout, stderr) => {
      if (stderr.length) console.error(stderr)
      if (error) {
        console.log(stdout)
        reject(error)
      } else resolve(stdout)
    })
  })
}

export async function isPitRepo () {
  return false
}
export async function isGitRepo () {
  return false
}

export async function isMaintainer (repo) {
  return true
}

export async function mkdirp (p) {
  D('pit> mkdir -p', p)
  return mkdir(p, { recursive: true })
}

export async function init (repo, opts = {}) {
  if (!isGitRepo(repo)) throw new Error(`Expected path "${repo}" to be a git repository`)
  await mkdirp(join(repo, REPOS_DIR))
  const cs = openStore(repo)
  const drive = await touch(cs)

  const key = drive.key.toString('hex')
  const peerInfo = {
    key,
    name: opts.name || await exec('git config --global --get user.name'),
    email: opts.name || await exec('git config --global --get user.email')
  }
  await writeFile(join(repo, PEER_FILE), JSON.stringify(peerInfo))
  if (await isMaintainer(repo)) await appendFile(join(repo, AUTHORS_FILE), key)
  const stats = await mirror(await localDrive(join(repo, '.git')), drive)
  D('pit> imported', stats)
  await drive.close()
  await cs.close()
  return key
}

export async function info (repo) {
  // Not implemented
  return {
    key: 'maintainer drive',
    peers: []
  }
}

/**
 * Creates a new corestore i  dst/.pit/corestore
 * Initializes receiving drive using key.
 * And does a one-shot sync.
 * TODO: --recursive:ly sync contributors after main checkout.
 */
export async function clone (key, dst) {
  dst = normalize(relative(process.cwd(), dst))
  const cs = new Corestore(join(dst, CORESTORE_DIR))
  const hd = await hyperDrive(cs, key)
  const ld = await localDrive(join(dst, MAIN_DIR))
  const peerDown = await peerUp(hd.discoveryKey, hd.corestore)
  const stats = await mirror(hd, ld)
  await exec(`git init ${dst}`)
  console.log('CWD1: ', process.cwd())
  const mainPath = join(process.cwd(), dst, MAIN_DIR) // Git-remotes require absolute paths
  await exec(`cd ${dst} && git remote add -f origin ${mainPath}`)
  console.log('CWD2: ', process.cwd())
  D('pit> cloned', stats)
  await hd.close()
  await cs.close()
  await peerDown()
  return stats
}

export async function add (repo, peer) {
  throw new Error('Not implemented')
}

export async function seed (repo) {
  const cs = openStore(repo)
  const authors = await readFile(join(repo, AUTHORS_FILE))
  const keys = authors
    .toString('utf8')
    .split('\n')
    .filter(k => k.trim().length)
  if (!keys.length) throw new Error('Nothing to seed!')
  // Init all uninitialized drives
  const drives = await Promise.all(keys.map(k => hyperDrive(cs, k)))
  const main = drives[0]
  const peerDown = await peerUp(main.discoveryKey, main.corestore)

  return async function deinit () {
    for (const drive of drives) await drive.close()
    await cs.close()
    await peerDown()
  }
}

export async function sync (repo) {
  throw new Error('Not implemented')
}

/**
 * @param {repo} string Path to Git-repository
 */
export function openStore (repo) {
  return new Corestore(join(repo, CORESTORE_DIR))
}

// --------------------------------------------------------
// ---------------- PRIVATE FUNCTIONS ---------------------
// --------------------------------------------------------

async function peerUp (topic, corestore) {
  // const topic = drive.discoveryKey // hash(drive.key)
  D('pit> joining topic', topic.hexSlice(0, 8))
  const swarm = new Hyperswarm()
  const discovery = swarm.join(topic)
  swarm.on('connection', socket => {
    const { remoteHost, remotePort } = socket.rawStream
    D(`pit> peer connected ${remoteHost}:${remotePort}`)
    corestore.replicate(socket)
  })
  // do one round of peer discovery
  const done = corestore.findingPeers() // signal to continue looking for peers? O_o
  // await swarm.flush().then(done, done)
  await discovery.flushed()
  return () => {
    done()
    swarm.destroy()
  }
  // return () => goodbye(() => swarm.destroy(), 2)
}

// Hyperdrive operation names borrowed from `drives` package
async function touch (store) {
  // const ns = cs.namespace(process.hrtime.bigint().toString()) // prob not needed
  const drive = new Hyperdrive(store)
  await drive.ready()
  D('pit> Drive created ', drive.key.hexSlice())
  return drive
}

async function mirror (src, dst) {
  const mirror = new MirrorDrive(src, dst)
  await mirror.done()
  return mirror.count
}

async function hyperDrive (cs, key) {
  if (typeof key === 'string') key = Buffer.from(key, 'hex')
  D('pit> Loading hyperdrive', key.hexSlice())
  const d = new Hyperdrive(cs, key)
  await d.ready()
  return d
}

async function localDrive (repo) {
  D('pit> Loading localdrive', repo)
  const d = new Localdrive(repo)
  await d.ready()
  return d
}

// function cwd () { return process.cwd() }
/*
async function stat (path) {
  try {
    return await nstat(path)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
*/

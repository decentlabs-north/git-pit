// SPDX-License-Identifier: AGPL-3.0-or-later
import { exec as nExec } from 'node:child_process'
import {
  mkdir,
  stat as nstat,
  writeFile,
  appendFile,
  readFile
} from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import MirrorDrive from 'mirror-drive'
import Localdrive from 'localdrive'
import Hyperswarm from 'hyperswarm'

const MAIN_DIR = '.pit/repos/main'
const REPOS_DIR = '.pit/repos'
const CORESTORE_DIR = '.pit/corestore'
const AUTHORS_FILE = '.git/authors'
const PEER_FILE = '.git/peer'
// const MERGE_REQUEST_DIR = './merge_requests' // out of scope for now.
const D = console.error

// Singletons *shrug*
const _store = {}
const _localDrives = {}
const _hyperDrives = {}

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
  const drive = await touch(join(repo, CORESTORE_DIR))
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
  return key
}

export async function info (repo) {
  // Not implemented
  return {
    key: 'maintainer drive',
    peers: []
  }
}

export async function clone (key, dst) {
  const cs = await store(join(dst, CORESTORE_DIR))
  const hd = await hyperDrive(cs, key)
  const ld = await localDrive(join(dst, MAIN_DIR))
  const stop = await doSwarm(hd) // .discoveryKey, cs)
  await new Promise(d => setTimeout(d, 3))
  const stats = await mirror(hd, ld)
  D('pit> cloned', stats)
  await stop()
}

export async function add (repo, peer) {
  throw new Error('Not implemented')
}

export async function seed (repo) {
  const authors = await readFile(join(repo, AUTHORS_FILE))
  const keys = authors
    .toString('utf8')
    .split('\n')
    .filter(k => k.trim().length)
  if (!keys.length) throw new Error('Nothing to seed!')
  const cs = await store(repo)
  // Init all uninitialized drives
  const drives = await Promise.all(keys.map(k => hyperDrive(cs, k)))
  const main = drives[0]
  return doSwarm(main)
}

export async function sync (repo) {
  throw new Error('Not implemented')
}

// --------------------------------------------------------
// ---------------- PRIVATE FUNCTIONS ---------------------
// --------------------------------------------------------

/**
 * hyperdrive:next/hypercore_crypto: throws error 'Key'
 * Don't know why. doing it the old fashioned way.
 */
/*
function hash (input) {
  return createHash('sha256')
    .update(input)
    .digest()
}*/

async function doSwarm (drive) { // topic, corestore) {
  const topic = drive.discoveryKey // hash(drive.key)
  D('pit> joing topic', topic.hexSlice(0, 8))
  const swarm = new Hyperswarm()
  swarm.join(topic)
  swarm.on('connection', socket => {
    const { remoteHost, remotePort } = socket.rawStream
    D(`pit> replicating to ${remoteHost}:${remotePort}`)
    drive.corestore.replicate(socket)
  })
  const done = drive.corestore.findingPeers()
  await swarm.flush().then(done, done)
  return () => swarm.destroy()
  // return () => goodbye(() => swarm.destroy(), 2)
}
// function cwd () { return process.cwd() }

// Hyperdrive operation names borrowed from `drives` package
async function touch (path) {
  const cs = await store(path)
  const ns = cs.namespace(process.hrtime.bigint().toString())
  const drive = new Hyperdrive(ns)
  await drive.ready()
  _hyperDrives[drive.key.toString('hex')] = drive
  D(`pit> ${path} drive loaded`, drive.key.toString('hex'))
  return drive
}

async function mirror (src, dst) {
  const mirror = new MirrorDrive(src, dst)
  await mirror.done()
  return mirror.count
}

async function stat (path) {
  try {
    return await nstat(path)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function store (path) {
  if (!_store[path]) _store[path] = new Corestore(path)
  return _store[path]
}

async function hyperDrive (cs, key) {
  if (typeof key === 'string') key = Buffer.from(key, 'hex')
  if (!_hyperDrives[key]) {
    _hyperDrives[key] = new Hyperdrive(cs, key)
    D('pit> Loading core', key)
    await _hyperDrives[key].ready()
  }
  return _hyperDrives[key]
}

async function localDrive (repo) {
  if (!_localDrives[repo]) {
    const d = _localDrives[repo] = new Localdrive(repo)
    await d.ready()
  }
  return _localDrives[repo]
}

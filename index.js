// SPDX-License-Identifier: AGPL-3.0-or-later
import { exec as nExec } from 'node:child_process'
import { join } from 'node:path'
const PIT_DIR = '.pit'
const REPOS_DIR = '.pit/repos'
const CORESTORE_DIR = '.pit/corestore'
const AUTHORS_FILE = '.git/AUTHORS'
const PEER_FILE = '.git/PEER'

export async function exec (cmd, opts = {}) {
  console.error('pit>', cmd)
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

export async function pitInit (prefix) {
  await exec(`mkdir -p ${join(prefix, REPOS_DIR)}`)
  const d = join(prefix, PIT_DIR)
}

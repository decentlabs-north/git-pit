[`pure | 📦`](https://github.com/telamon/create-pure)
[`code style | standard`](https://standardjs.com/)
# git-pit

> Makes Git make sense

This tool allows you to use Git
over secure peer-to-peer streams kindly supplied by the good peers @ [holepunch](https://holepunch.to).

At the time of writing this is alpha-grade software,
Do checkout:

- [blueprint](https://raw.githubusercontent.com/decentlabs-north/whiteboard/master/pit-blueprint-v1.pdf)
- [issues](https://github.com/decentlabs-north/git-pit/issues)

Wanna help? Come say hi ➡️ [DLabs Discord](https://discord.gg/8RMRUPZ9RS)

## Use

**Install Pit**
```bash
$ npm i -g git-pit
```

**Maintainer does:**
```bash
$ cd my-git-project/
$ pit init
Initialized Pit as Maintainer, share:
34516d47463994d0acaa16014d4718b5f7aba74040d91bcd5fcbd5d962e6b974

$ pit seed
Seeding:
34516d47463994d0acaa16014d4718b5f7aba74040d91bcd5fcbd5d962e6b974
Press Ctrl+c to stop
```

**Contributor does**
```bash
$ clone 34516d47463994d0acaa16014d4718b5f7aba74040d91bcd5fcbd5d962e6b974 the-project
pit> clone complete { files: 52, add: 52, remove: 0, change: 0 }
```

## Status
Done!

- `init`
- `clone`
- `seed`

'TODO' priority:

- `add`
- `info`
- `sync`
- `fork`
- `list`
- `request`

## License

[AGPL-3.0-or-later](./LICENSE)

2023 &#x1f12f; tony@decentlabs.se

# summit-intel

Run Summit repository intelligence against any repository with zero setup.

## Usage

```bash
npx summit-intel analyze ./repo
npx summit-intel analyze https://github.com/vercel/next.js
npx summit-intel analyze git@github.com:user/repo.git
```

The command clones remote repositories to a temporary directory, analyzes source modules,
and prints an architecture/risk summary.

# Deployment — GitHub & GitHub Pages

The game is hosted **for free** on GitHub Pages straight from the repo. There's no
build step and no server — Pages just serves the static files in `docs/`.

## The facts

| Thing | Value |
| --- | --- |
| GitHub account | `ryanrayfrank` |
| Repo | `ryanrayfrank/juniorraiders` |
| Remote URL | `https://github.com/ryanrayfrank/juniorraiders.git` |
| Branch | `main` |
| Pages source | **branch `main`, folder `/docs`** |
| Live URL | https://ryanrayfrank.github.io/juniorraiders/ |

Local working copy: `c:\Users\rfrank\Documents\Other\Football` (Windows + PowerShell).

## How to deploy a change

Deploying = committing your changes to `docs/` and pushing `main`. GitHub Pages
rebuilds automatically (usually within ~30–60 seconds).

```powershell
git add docs
git commit -m "Describe the change"
git push origin main
```

Then hard-refresh the live URL (Ctrl+F5) to bypass the browser cache.

## One-time setup (already done — for reference)

If Pages ever needs to be reconnected:

1. Push the code to `main` with the site in `docs/`.
2. On GitHub: **repo → Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Set branch = **`main`**, folder = **`/docs`**, then **Save**.
5. Wait for the green "Your site is live at …" banner.

## Windows / PowerShell gotchas (important)

The default shell here is **PowerShell**, which trips up a few common git habits:

- **No `&&` chaining.** `git add . && git commit …` fails. Run commands on
  separate lines, or chain with `;` (note: `;` keeps going even if one fails).
- **No bash heredocs.** `git commit -m "$(cat <<'EOF' … EOF)"` does **not** work.
  For a multi-line commit message, write it to a temp file and use `-F`:

  ```powershell
  # write the message to .git/COMMIT_MSG.tmp first, then:
  git commit -F .git/COMMIT_MSG.tmp
  Remove-Item .git/COMMIT_MSG.tmp
  ```

  (For short messages just use one or more `-m` flags.)
- **`2>/dev/null` doesn't exist.** Use `2>$null` to suppress errors in PowerShell.
- **`gh` (GitHub CLI) is not installed** on this machine, so you can't query Pages
  build status from the terminal. Verify the deploy by fetching the live URL
  instead. Auth for `git push` works via the credential helper (the remote URL
  embeds the `ryanrayfrank` username).

## Verifying a deploy

```powershell
git log --oneline -3          # confirm your commit is on top
git status                    # should be "working tree clean" / up to date
```

Then load https://ryanrayfrank.github.io/juniorraiders/ and hard-refresh.

## What is NOT deployed

`input/` (the source playbook PDFs + images) and `output/` (the old single-file
prototype + the conversation recap) are **git-ignored** and never published. Only
`docs/` (and the markdown like this folder + the root `README.md`) is in the repo.

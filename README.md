# validate-n8n-pull-request-title

GitHub Action to validate that PR titles in [`n8n-io/n8n`](https://github.com/n8n-io/n8n) match [n8n's version](https://www.notion.so/n8n/Release-Process-fce65faea3d5403a85210f7e7a60d0f8) of the Conventional Commits spec.

## Setup

Create `.github/workflows/validate-pr-title.yml` containing:

```yml
name: Validate PR title

on:
  pull_request:
    types:
      - opened
      - edited
      - synchronize

jobs:
  validate_pr_title:
    name: Validate PR title
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Validate PR title
        uses: ivov/validate-n8n-pull-request-title@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Output

On validation failure, this action will populate the [`validation_issues` output](https://docs.github.com/en/actions/using-jobs/defining-outputs-for-jobs). You can use this output in subsequent steps, e.g. to send the validation issue as a comment on the pull request.

<details>
<summary>Output usage example</summary>

````yml
name: Validate PR title

on:
  pull_request:
    types:
      - opened
      - edited
      - synchronize

jobs:
  main:
    name: Validate PR title and notify
    runs-on: ubuntu-latest
    steps:
      - name: Validate PR title
        uses: ivov/validate-n8n-pull-request-title@v1
        id: validate_pr_title
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Post validation issue as comment
        uses: marocchino/sticky-pull-request-comment@v2
        if: always() # ensure workflow continues executing despite validation errors
        with:
          header: pr_title_failed_validation # for later deletion
          message: |
            Thank you for your contribution!

            PR titles in this repo follow our version of the Conventional Commits spec.
            This allows us to automatically generate the changelog for the next release.
            Therefore, we ask you to adjust your PR title to solve the issue(s) below:

            ```
            ${{ steps.validate_pr_title.outputs.validation_issues }}
            ```

      - name: Remove validation issue comment once resolved
        if: ${{ steps.validate_pr_title.outputs.validation_issues == null }}
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: pr_title_failed_validation
          delete: true
````

</details>

## Release

```sh
# 1. update build - THIS NEEDS TO HAPPEN IN THE PR
npm run build
git add dist
git commit -m "Update built action"

# 2. Merge PR

# 3. create new tag
git tag v1.2.0
git push origin v1.2.0

# 4. create release with new tag
# https://github.com/n8n-io/validate-n8n-pull-request-title/releases/new

# 5. move forward major to latest
git tag -fa v1 -m "Move forward v1 tag"
git push origin v1 --force
```

More info on [versioning](https://github.com/actions/toolkit/blob/main/docs/action-versioning.md).

## Author

© 2022 [Iván Ovejero](https://github.com/ivov)

## License

Distributed under the [MIT License](LICENSE.md).

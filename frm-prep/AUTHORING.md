# Authoring rules: FRM Part I Study Notes

Content lives in `content/b{book}/{nn}.md`, one file per reading (e.g. `content/b4/01.md`).
Run `node build.mjs` to regenerate `site/`. The build fails on banned phrases, KaTeX errors,
malformed blocks, and malformed questions, and prints `file:line` for each problem.

## Writing standard

Every sentence must teach one of: a definition, a mechanism (why or how something happens),
a formula or how to apply it, a number, a distinction between two ideas, or a consequence.

Never write:

- Signposting or hype: "this is the big one", "this is where people get confused",
  "it's important to note", "note that", "let's", "in this section", "key takeaway", "crucial".
- Statements that something is hard, tricky, or confusing. State the wrong move and its numeric
  consequence instead (in a `:::error` block).
- Claims about how often a topic is tested.
- Rhetorical questions, restating a heading as a sentence, or closing summaries that repeat the section.

Always:

- Bold a term where it is defined: `**Expected shortfall (ES)** is the average loss in the tail beyond VaR.`
- Put each formula in a `:::formula` box and define every symbol in it.
- Give each method a worked example with every intermediate value (4 significant figures).
- When two ideas are easy to swap, put them side by side in a table with the distinguishing feature.
- Cover every learning objective of the reading, using the book's notation and conventions.
- Write original explanations and original questions. Do not copy text or questions from the books.
- Avoid `~` (marked renders `~text~` as strikethrough) and bare `*` for multiplication; use `×` or math.

## Syntax

Optional front matter, used as the lede under the chapter title:

```
---
lede: Concrete list of what the reading covers.
---
```

Math: inline `\( ... \)`, display `$$ ... $$` on its own lines. Dollar signs in prose are plain text.
Macros: `\E`, `\Var`, `\Cov`, `\Corr`, `\VaR`, `\ES`, `\SD`. No math inside `##`/`###` headings.

Blocks (not nested):

```
:::formula Label
$$ ... $$
- \(x\): what x is
:::

:::example Title
Problem, then numbered steps, then **Answer:** ...
:::

:::error Optional label (default "Common error")
The wrong move, the number it produces, and the right number.
:::

:::aside Label (required)
Short supporting material, e.g. calculator keystrokes or a regulatory detail.
:::

:::question
Stem (may include tables)
- [ ] option
- [x] correct option
- [ ] option
- [ ] option
---
Explanation: full computation, and why the main distractors are wrong.
:::
```

Questions go at the end of the file under `## Practice questions` (6-12 per reading).
Links: `[text](#/b4-01)` for a chapter, `[text](#/b4-01/s-section-slug)` for a section.

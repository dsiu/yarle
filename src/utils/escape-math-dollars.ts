// Obsidian, pandoc and other readers with maths take `$$…$$` as display maths and `$…$` as inline
// maths when the closing `$` comes right after a non-space character. A web clip's `$$$` price
// rating or a shell line's `"$HOME"` turned the text between into a formula, and bold marks
// inside it showed as literal `**`. Escape every `$` that is part of `$$` or could close (a `$` at
// the start of a text node may follow text in the node before, so it is escaped too). With no `$`
// left that can close, no pair forms, and `$30 and $40` stays as typed. `\$` is plain `$` in
// every CommonMark reader.
export const escapeMathDollars = (text: string): string =>
    text.replace(/\$/g, (dollar: string, i: number) =>
        (i === 0 || /\S/.test(text[i - 1]) || text[i + 1] === '$') ? '\\$' : '$');

// Markdown has no superscript or subscript, so H<sub>2</sub>O became H2O and x<sup>2</sup> x2.
// Keep them as HTML, as <u> is kept.
export const supSubRule = {
  filter: ['sup', 'sub'],
  replacement: (content: any, node: any) => {
    const tag = node.nodeName.toLowerCase();

    return content.trim() ? `<${tag}>${content}</${tag}>` : content;
  },
};

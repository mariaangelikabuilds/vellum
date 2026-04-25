import { Mark, mergeAttributes } from '@tiptap/core';

export const EvidenceMark = Mark.create({
  name: 'evidence',
  addAttributes() {
    return {
      evidenceId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-evidence-id'),
        renderHTML: (attrs) =>
          attrs.evidenceId ? { 'data-evidence-id': attrs.evidenceId } : {},
      },
      sourceUrl: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-source-url'),
        renderHTML: (attrs) => (attrs.sourceUrl ? { 'data-source-url': attrs.sourceUrl } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-evidence-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'evidence' }), 0];
  },
});

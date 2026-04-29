import { Mark, mergeAttributes } from '@tiptap/core';

export type IntentKind = 'miss' | 'bury' | 'drift' | 'land';

export interface IntentMarkAttrs {
  intentMarkId: string | null;
  kind: IntentKind;
  why: string | null;
  suggestion: string | null;
}

export const IntentMark = Mark.create({
  name: 'intentMark',
  addAttributes() {
    return {
      intentMarkId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-intent-id'),
        renderHTML: (attrs) =>
          attrs.intentMarkId ? { 'data-intent-id': attrs.intentMarkId } : {},
      },
      kind: {
        default: 'miss',
        parseHTML: (el) => el.getAttribute('data-intent-kind') ?? 'miss',
        renderHTML: (attrs) => ({ 'data-intent-kind': attrs.kind }),
      },
      why: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-intent-why'),
        renderHTML: (attrs) => (attrs.why ? { 'data-intent-why': attrs.why } : {}),
      },
      suggestion: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-intent-suggestion'),
        renderHTML: (attrs) =>
          attrs.suggestion ? { 'data-intent-suggestion': attrs.suggestion } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-intent-kind]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes['data-intent-kind'] ?? 'miss';
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: `intent intent--${kind}` }),
      0,
    ];
  },
});

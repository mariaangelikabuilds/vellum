import { Mark, mergeAttributes } from '@tiptap/core';

export type ClaimType = 'factual' | 'opinion' | 'speculation' | 'evidence' | 'question';

export interface ClaimMarkAttrs {
  claimId: string | null;
  claimType: ClaimType;
  verified: boolean;
  contradicted: boolean;
}

export const ClaimMark = Mark.create({
  name: 'claim',
  addAttributes() {
    return {
      claimId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-claim-id'),
        renderHTML: (attrs) => (attrs.claimId ? { 'data-claim-id': attrs.claimId } : {}),
      },
      claimType: {
        default: 'factual',
        parseHTML: (el) => el.getAttribute('data-claim-type') ?? 'factual',
        renderHTML: (attrs) => ({ 'data-claim-type': attrs.claimType }),
      },
      verified: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-verified') === 'true',
        renderHTML: (attrs) => (attrs.verified ? { 'data-verified': 'true' } : {}),
      },
      contradicted: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-contradicted') === 'true',
        renderHTML: (attrs) => (attrs.contradicted ? { 'data-contradicted': 'true' } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-claim-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const classes = ['claim'];
    if (HTMLAttributes['data-contradicted']) classes.push('claim--contradicted');
    if (HTMLAttributes['data-verified']) classes.push('claim--verified');
    return ['span', mergeAttributes(HTMLAttributes, { class: classes.join(' ') }), 0];
  },
});

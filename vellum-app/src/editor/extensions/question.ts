import { Mark, mergeAttributes } from '@tiptap/core';

export const QuestionMark = Mark.create({
  name: 'question',
  addAttributes() {
    return {
      questionId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-question-id'),
        renderHTML: (attrs) =>
          attrs.questionId ? { 'data-question-id': attrs.questionId } : {},
      },
      answered: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-answered') === 'true',
        renderHTML: (attrs) => (attrs.answered ? { 'data-answered': 'true' } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-question-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'question' }), 0];
  },
});

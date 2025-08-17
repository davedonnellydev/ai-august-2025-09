const mockCreate = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(() => ({
  responses: {
    create: mockCreate,
  },
}));

module.exports = {
  default: mockOpenAI,
  __mockCreate: mockCreate,
  __mockOpenAI: mockOpenAI,
};

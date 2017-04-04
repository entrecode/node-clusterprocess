const chai = require('chai');

const expect = chai.expect;

describe('basic test of testing library', () => {
  it('test that javescript is still a little crazy', () => {
    expect([] + []).to.be.equal('');
  });
});

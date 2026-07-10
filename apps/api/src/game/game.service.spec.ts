import { GameService } from './game.service';

describe('GameService.computeAvg', () => {
  it('averages numeric cards', () => {
    expect(GameService.computeAvg(['1', '3', '8'])).toBe(4);
  });
  it('excludes ? and coffee', () => {
    expect(GameService.computeAvg(['5', '?', '☕', '5'])).toBe(5);
  });
  it('null when no numeric votes', () => {
    expect(GameService.computeAvg(['?', '☕'])).toBeNull();
  });
});

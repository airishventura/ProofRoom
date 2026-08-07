import { describe, expect, it } from 'vitest';
import { isDarkShellPath, DARK_SHELL_ROUTES } from './darkShellRoutes';

describe('isDarkShellPath', () => {
  it('marks workspace/audit/publish/approvals as dark', () => {
    for (const r of DARK_SHELL_ROUTES) {
      expect(isDarkShellPath(r)).toBe(true);
    }
    expect(isDarkShellPath('/workspace/extra')).toBe(true);
  });

  it('keeps marketing/public routes light', () => {
    expect(isDarkShellPath('/')).toBe(false);
    expect(isDarkShellPath('/login')).toBe(false);
    expect(isDarkShellPath('/r/r1')).toBe(false);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Prisma schema datasource', () => {
  it('reads DATABASE_URL from environment variable', () => {
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const schema = readFileSync(schemaPath, 'utf8');

    expect(schema).toContain('url      = env("DATABASE_URL")');
    expect(schema).not.toMatch(/url\s*=\s*"postgresql:\/\//);
  });
});

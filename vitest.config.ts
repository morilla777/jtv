import { readFileSync } from 'node:fs';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'jtv-legacy-text-loader',
      load(id) {
        const [filePath] = id.split('?');

        if (!filePath.endsWith('.jtv')) {
          return null;
        }

        return `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))};`;
      },
    },
  ],
});


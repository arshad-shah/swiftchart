import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

const [coreTypeDoc, coreSidebar] = createStarlightTypeDocPlugin();
const [reactTypeDoc, reactSidebar] = createStarlightTypeDocPlugin();

export default defineConfig({
  site: 'https://swiftchart.pages.dev',
  integrations: [
    react(),
    starlight({
      title: 'SwiftChart',
      description:
        'Lightning-fast, zero-dependency Canvas 2D charting library with React bindings.',
      logo: {
        src: './src/assets/logo.svg',
        alt: 'SwiftChart logo',
        replacesTitle: false,
      },
      favicon: '/favicon.svg',
      social: {
        github: 'https://github.com/ArshadShah/swiftchart',
      },
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
      },
      customCss: ['./src/styles/site.css'],
      plugins: [
        coreTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: '../tsconfig.json',
          output: 'api/core',
          sidebar: { label: 'Core API', collapsed: true },
          typeDoc: { fileExtension: '.md' },
        }),
        reactTypeDoc({
          entryPoints: ['../src/react/index.tsx'],
          tsconfig: '../tsconfig.json',
          output: 'api/react',
          sidebar: { label: 'React API', collapsed: true },
          typeDoc: { fileExtension: '.md' },
        }),
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'Quick start (Vanilla)', link: '/getting-started/quickstart-vanilla/' },
            { label: 'Quick start (React)', link: '/getting-started/quickstart-react/' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Data mapping', link: '/guides/data-mapping/' },
            { label: 'Theming', link: '/guides/theming/' },
            { label: 'Animations', link: '/guides/animations/' },
            { label: 'Responsive', link: '/guides/responsive/' },
            { label: 'React refs', link: '/guides/react-refs/' },
          ],
        },
        {
          label: 'Charts',
          autogenerate: { directory: 'charts' },
        },
        coreSidebar,
        reactSidebar,
      ],
    }),
  ],
});

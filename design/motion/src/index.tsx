import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { QuakeCity } from './QuakeCity';

// Every file in src/scenes becomes two compositions: <file>-dark and <file>-light.
const ctx = (require as any).context('./scenes', false, /\.tsx$/);
const scenes: [string, React.FC<{ theme: 'dark' | 'light' }>][] = ctx.keys()
  .filter((key: string) => key.startsWith('./'))
  .map((key: string) => [key.replace(/^\.\//, '').replace(/\.tsx$/, ''), ctx(key).default]);

const Root: React.FC = () => (
  <>
    {(['dark', 'light'] as const).map((theme) => (
      <Composition key={theme} id={`quake-city-${theme}`} component={QuakeCity} defaultProps={{ theme }}
        width={800} height={450} fps={12} durationInFrames={96} />
    ))}
    {scenes.flatMap(([id, C]) => (['dark', 'light'] as const).map((theme) => (
      <Composition key={id + theme} id={`${id}-${theme}`} component={C} defaultProps={{ theme }}
        width={800} height={450} fps={12} durationInFrames={96} />
    )))}
  </>
);
registerRoot(Root);

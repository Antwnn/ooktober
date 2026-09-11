# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Change code snippets**

The snippets are located in the `public` folder.  
Change the code or create new files in there.

**Render video**

```console
npx remotion render
```

## Oktober personalization tool

A standalone web tool (`app/`) lets you type a name/word, preview the
"duplicated o" animation live, and download a rendered MP4. It's a separate
Remotion composition (`OoktoberWord`, see `src/ooktober/`) from the
code-snippet video above.

```console
npm run tool:dev
```

This starts the render server (port 3001) and the web app (port 5173) together
— open http://localhost:5173. You can also preview the `OoktoberWord`
composition directly in Remotion Studio (`npm run dev`).

**Upgrade Remotion**

```console
npx remotion upgrade
```

## More examples

Visit the [Code Hike examples](https://github.com/code-hike/examples/tree/main/with-remotion) for more variants of code animations.

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

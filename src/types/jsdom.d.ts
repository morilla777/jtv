declare module 'jsdom' {
  export class JSDOM {
    readonly window: {
      readonly DOMParser: typeof DOMParser;
    };

    constructor(html?: string);
  }
}

